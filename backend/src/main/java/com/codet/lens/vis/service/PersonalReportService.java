package com.codet.lens.vis.service;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.dto.dash.PersonalReportDtos.*;
import com.codet.lens.vis.entity.*;
import com.codet.lens.vis.mapper.*;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PersonalReportService {
    private final VisDashboardMapper dashboards;
    private final VisDashboardUserPrefMapper preferences;
    private final VisDashboardUserViewMapper views;
    private final VisDashboardAccess access;
    private final DashboardViewStateService states;

    public List<PersonalReportInfo> reports() {
        Long userId = user();
        var assigned = access.assignedDashboardIds();
        if (!access.canDesign() && assigned.isEmpty()) return List.of();
        List<VisDashboard> visible = dashboards.selectList(Wrappers.<VisDashboard>lambdaQuery()
                .eq(VisDashboard::getStatus, Status.EBL)
                .in(!access.canDesign(), VisDashboard::getId, assigned));
        Map<Long, VisDashboardUserPref> pref = preferences.selectList(Wrappers.<VisDashboardUserPref>lambdaQuery()
                .eq(VisDashboardUserPref::getUserId, userId)).stream()
                .collect(Collectors.toMap(VisDashboardUserPref::getDashboardId, p -> p));
        return visible.stream().map(d -> info(d, pref.get(d.getId())))
                .sorted(Comparator.comparing(PersonalReportInfo::getLastViewedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(PersonalReportInfo::getDashboardName))
                .toList();
    }

    public PersonalReportInfo preference(Long dashboardId) {
        return info(requireDashboard(dashboardId), preferences.selectOne(Wrappers.<VisDashboardUserPref>lambdaQuery()
                .eq(VisDashboardUserPref::getUserId, user()).eq(VisDashboardUserPref::getDashboardId, dashboardId)));
    }

    @Transactional
    public void favorite(ReportPreferenceRequest request) {
        VisDashboardUserPref pref = ensure(request.getDashboardId());
        if (request.getFavorite() == null) throw ResultException.fail("请指定收藏状态");
        preferences.update(null, Wrappers.<VisDashboardUserPref>lambdaUpdate().eq(VisDashboardUserPref::getId, pref.getId())
                .set(VisDashboardUserPref::getFavorite, request.getFavorite()));
    }

    @Transactional
    public void visit(Long dashboardId) {
        VisDashboardUserPref pref = ensure(dashboardId);
        long now = System.currentTimeMillis();
        if (pref.getLastViewedAt() == null || now - pref.getLastViewedAt() > 60_000)
            preferences.update(null, Wrappers.<VisDashboardUserPref>lambdaUpdate().eq(VisDashboardUserPref::getId, pref.getId())
                    .set(VisDashboardUserPref::getLastViewedAt, now));
    }

    public List<PersonalViewInfo> listViews(Long dashboardId) {
        requireDashboard(dashboardId);
        return views.selectList(Wrappers.<VisDashboardUserView>lambdaQuery()
                        .eq(VisDashboardUserView::getUserId, user()).eq(VisDashboardUserView::getDashboardId, dashboardId)
                        .orderByDesc(VisDashboardUserView::getModifyAt))
                .stream().map(PersonalReportService::viewInfo).toList();
    }

    @Transactional
    public Long saveView(SavePersonalViewRequest request) {
        VisDashboard dashboard = requireDashboard(request.getDashboardId());
        // 同一用户/报表的视图写入使用偏好行串行化，保证数量上限和默认引用一致。
        ensure(dashboard.getId());
        VisDashboardUserView view = request.getId() == null ? new VisDashboardUserView() : lockOwned(request.getId(), dashboard.getId());
        String bindings = java.util.Objects.equals(request.getStateJson(), view.getStateJson()) ? view.getBindingsJson() : null;
        var snapshot = states.snapshot(dashboard, request.getStateJson(), bindings);
        view.setUserId(user());
        view.setDashboardId(dashboard.getId());
        view.setViewName(request.getViewName().trim());
        view.setStateJson(snapshot.stateJson());
        view.setBindingsJson(snapshot.bindingsJson());
        if (request.getId() == null) {
            if (listViews(dashboard.getId()).size() >= 30) throw ResultException.fail("每张报表最多保存 30 个个人视图");
            view.setRevision(1);
            view.createCallback();
            views.insert(view);
        } else {
            if (request.getRevision() == null) throw ResultException.fail("缺少视图版本，请重新打开");
            view.setRevision(request.getRevision() + 1);
            view.modifyCallback();
            int updated = views.update(view, Wrappers.<VisDashboardUserView>lambdaUpdate()
                    .eq(VisDashboardUserView::getId, view.getId()).eq(VisDashboardUserView::getUserId, user())
                    .eq(VisDashboardUserView::getRevision, request.getRevision()));
            if (updated != 1) throw ResultException.fail("视图已在其他页面修改，请重新打开后保存");
        }
        return view.getId();
    }

    @Transactional
    public void deleteView(Long viewId) {
        VisDashboardUserView view = owned(viewId, null);
        ensure(view.getDashboardId());
        lockOwned(viewId, view.getDashboardId());
        preferences.update(null, Wrappers.<VisDashboardUserPref>lambdaUpdate().eq(VisDashboardUserPref::getUserId, user())
                .eq(VisDashboardUserPref::getDefaultViewId, viewId).set(VisDashboardUserPref::getDefaultViewId, null));
        views.deleteById(viewId);
    }

    @Transactional
    public void defaultView(ReportPreferenceRequest request) {
        VisDashboardUserPref pref = ensure(request.getDashboardId());
        if (request.getDefaultViewId() != null) {
            var view = lockOwned(request.getDefaultViewId(), request.getDashboardId());
            states.snapshot(requireDashboard(request.getDashboardId()), view.getStateJson(), view.getBindingsJson());
        }
        preferences.update(null, Wrappers.<VisDashboardUserPref>lambdaUpdate().eq(VisDashboardUserPref::getId, pref.getId())
                .set(VisDashboardUserPref::getDefaultViewId, request.getDefaultViewId()));
    }

    public ResolvedView resolve(ResolveViewRequest request) {
        VisDashboard dashboard = requireDashboard(request.getDashboardId());
        VisDashboardUserView view = request.getViewId() == null ? null : owned(request.getViewId(), dashboard.getId());
        var snapshot = states.snapshot(dashboard, view == null ? request.getStateJson() : view.getStateJson(),
                view == null ? null : view.getBindingsJson());
        ResolvedView result = new ResolvedView();
        result.setStateJson(snapshot.stateJson());
        result.setSummary(snapshot.summary());
        if (view != null) {
            result.setViewId(view.getId()); result.setViewName(view.getViewName()); result.setRevision(view.getRevision());
        }
        return result;
    }

    private VisDashboardUserView lockOwned(Long viewId, Long dashboardId) {
        VisDashboardUserView view = views.selectOne(Wrappers.<VisDashboardUserView>lambdaQuery()
                .eq(VisDashboardUserView::getId, viewId).eq(VisDashboardUserView::getUserId, user())
                .eq(VisDashboardUserView::getDashboardId, dashboardId).last("FOR UPDATE"));
        if (view == null) throw ResultException.fail("个人视图不存在或不可访问");
        return view;
    }

    private VisDashboardUserView owned(Long viewId, Long dashboardId) {
        VisDashboardUserView view = views.selectById(viewId);
        if (view == null || !user().equals(view.getUserId())
                || (dashboardId != null && !dashboardId.equals(view.getDashboardId()))) throw ResultException.fail("个人视图不存在或不可访问");
        return view;
    }

    public VisDashboard requireDashboard(Long dashboardId) {
        access.assertCanView(dashboardId);
        VisDashboard row = dashboards.selectById(dashboardId);
        if (row == null || !Status.EBL.equals(row.getStatus())) throw ResultException.fail("报表不存在或已停用");
        return row;
    }

    private VisDashboardUserPref ensure(Long dashboardId) {
        requireDashboard(dashboardId);
        VisDashboardUserPref pref = new VisDashboardUserPref();
        pref.setId(IdWorker.getId()); pref.setUserId(user()); pref.setDashboardId(dashboardId); pref.createCallback();
        preferences.ensure(pref);
        return preferences.selectOne(Wrappers.<VisDashboardUserPref>lambdaQuery()
                .eq(VisDashboardUserPref::getUserId, user()).eq(VisDashboardUserPref::getDashboardId, dashboardId));
    }

    private static Long user() {
        Long id = AuthContext.getUserIdLong();
        if (id == null) throw ResultException.fail("请先登录");
        return id;
    }
    private static PersonalReportInfo info(VisDashboard dashboard, VisDashboardUserPref pref) {
        PersonalReportInfo info = new PersonalReportInfo();
        info.setDashboardId(dashboard.getId()); info.setDashboardName(dashboard.getDashName());
        info.setDescription(dashboard.getDashDesc()); info.setIcon(dashboard.getIcon());
        info.setFavorite(pref != null && Boolean.TRUE.equals(pref.getFavorite()));
        if (pref != null) {
            info.setDefaultViewId(pref.getDefaultViewId());
            if (pref.getLastViewedAt() != null) info.setLastViewedAt(Instant.ofEpochMilli(pref.getLastViewedAt()).toString());
        }
        return info;
    }
    private static PersonalViewInfo viewInfo(VisDashboardUserView view) {
        PersonalViewInfo info = new PersonalViewInfo();
        info.setId(view.getId()); info.setDashboardId(view.getDashboardId()); info.setViewName(view.getViewName());
        info.setStateJson(view.getStateJson()); info.setRevision(view.getRevision());
        return info;
    }
}
