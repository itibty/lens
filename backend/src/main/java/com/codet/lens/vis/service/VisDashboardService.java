package com.codet.lens.vis.service;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.PageResponse;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.ResultEnum;
import com.codet.lens.common.ResultException;
import com.codet.lens.common.ConvertUtil;
import com.codet.lens.sys.entity.SysRoleDashboard;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.sys.service.PermissionTokenService;
import com.codet.lens.vis.core.dash.VisDashWidgets;
import com.codet.lens.vis.dto.dash.QueryVisDashboardRequest;
import com.codet.lens.vis.dto.dash.VisDashboardInfo;
import com.codet.lens.vis.dto.dash.VisDashboardLayoutItem;
import com.codet.lens.vis.dto.dash.VisDashboardMetadataUpdateRequest;
import com.codet.lens.vis.dto.dash.VisDashboardSaveRequest;
import com.codet.lens.vis.entity.VisCard;
import com.codet.lens.vis.entity.VisDashGroup;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.entity.VisDashboardCard;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDashGroupMapper;
import com.codet.lens.vis.mapper.VisDashboardCardMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/** 看板配置。整看板一次保存：元数据 + widgets 成员索引。 */
@Service
@RequiredArgsConstructor
public class VisDashboardService {

    private final VisDashboardMapper visDashboardMapper;
    private final VisDashboardCardMapper visDashboardCardMapper;
    private final VisCardMapper visCardMapper;
    private final SysRoleDashboardMapper sysRoleDashboardMapper;
    private final VisDashGroupMapper dashGroupMapper;
    private final VisDashGroupService dashGroupService;
    private final VisDashboardAccess dashboardAccess;
    private final PermissionTokenService permissionTokenService;

    public PageResponse<VisDashboardInfo> query(QueryVisDashboardRequest request) {
        LambdaQueryWrapper<VisDashboard> wrapper = Wrappers.<VisDashboard>lambdaQuery()
                .ne(VisDashboard::getStatus, FieldConst.DEL)
                .eq(request.getId() != null, VisDashboard::getId, request.getId())
                .eq(StrUtil.isNotBlank(request.getStatus()), VisDashboard::getStatus, request.getStatus())
                .like(StrUtil.isNotBlank(request.getDashName()), VisDashboard::getDashName, request.getDashName())
                .orderByDesc(VisDashboard::getId);
        applyGroupFilter(wrapper, request.getGroupId(), request.getIncludeDescendants());
        IPage<VisDashboardInfo> page = visDashboardMapper.selectPage(request.getPage().toIPage(), wrapper)
                .convert(row -> toInfo(row, false));
        fillGroupNames(page.getRecords());
        return ConvertUtil.toPageResponse(page);
    }

    public VisDashboardInfo detail(Long dashboardId) {
        dashboardAccess.assertCanView(dashboardId);
        VisDashboard row = requireDashboard(dashboardId);
        VisDashboardInfo info = toInfo(row, true);
        fillGroupNames(List.of(info));
        return info;
    }

    @Transactional(rollbackFor = Exception.class)
    public Long save(VisDashboardSaveRequest request) {
        List<Long> cardIds = VisDashWidgets.collectCardIds(request.getConfigJson());
        if (CollUtil.isNotEmpty(cardIds)) {
            requireCardsExist(cardIds);
        }
        VisDashboard previous = request.getId() == null ? null : requireDashboard(request.getId());

        VisDashboard entity = BeanUtil.copyProperties(request, VisDashboard.class);
        entity.setDashName(entity.getDashName().trim());
        entity.setIcon(StrUtil.blankToDefault(entity.getIcon(), null));
        entity.setGroupId(request.getGroupId() == null ? 0L : request.getGroupId());
        if (entity.getGroupId() != 0) {
            VisDashGroup group = dashGroupMapper.selectById(entity.getGroupId());
            if (group == null || FieldConst.DEL.equals(group.getStatus())) {
                throw fail("分组不存在");
            }
        }
        if (StrUtil.isBlank(entity.getConfigJson())) {
            entity.setConfigJson(null);
        }
        if (request.getId() == null) {
            entity.createCallback();
            visDashboardMapper.insert(entity);
        } else {
            entity.modifyCallback();
            visDashboardMapper.updateById(entity);
            if (reportEntryChanged(previous, entity)) {
                permissionTokenService.invalidateDashboardUsers(entity.getId());
            }
        }
        replaceCards(entity.getId(), cardIds);
        return entity.getId();
    }

    @Transactional(rollbackFor = Exception.class)
    public void updateMetadata(VisDashboardMetadataUpdateRequest request) {
        VisDashboard previous = requireDashboard(request.getId());
        long groupId = request.getGroupId() == null ? 0L : request.getGroupId();
        if (groupId != 0) {
            VisDashGroup group = dashGroupMapper.selectById(groupId);
            if (group == null || FieldConst.DEL.equals(group.getStatus())) {
                throw fail("分组不存在");
            }
        }
        VisDashboard patch = new VisDashboard();
        patch.modifyCallback();
        visDashboardMapper.update(patch, Wrappers.<VisDashboard>lambdaUpdate()
                .eq(VisDashboard::getId, request.getId())
                .ne(VisDashboard::getStatus, FieldConst.DEL)
                .set(VisDashboard::getDashName, request.getDashName().trim())
                .set(VisDashboard::getDashDesc, request.getDashDesc())
                .set(VisDashboard::getIcon, StrUtil.blankToDefault(request.getIcon(), null))
                .set(VisDashboard::getGroupId, groupId));
        if (!Objects.equals(previous.getDashName(), request.getDashName().trim())
                || !Objects.equals(StrUtil.blankToDefault(previous.getIcon(), null),
                StrUtil.blankToDefault(request.getIcon(), null))
                || normalizedGroupId(previous.getGroupId()) != groupId) {
            permissionTokenService.invalidateDashboardUsers(request.getId());
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public void moveGroup(List<Long> dashboardIds, Long groupId) {
        long target = groupId == null ? 0L : groupId;
        if (target != 0) {
            VisDashGroup group = dashGroupMapper.selectById(target);
            if (group == null || FieldConst.DEL.equals(group.getStatus())) {
                throw fail("分组不存在");
            }
        }
        List<Long> changedIds = new ArrayList<>();
        for (Long dashboardId : dashboardIds) {
            VisDashboard dashboard = requireDashboard(dashboardId);
            if (normalizedGroupId(dashboard.getGroupId()) != target) {
                changedIds.add(dashboardId);
            }
        }
        VisDashboard patch = new VisDashboard();
        patch.setGroupId(target);
        patch.modifyCallback();
        visDashboardMapper.update(patch, Wrappers.<VisDashboard>lambdaUpdate()
                .ne(VisDashboard::getStatus, FieldConst.DEL)
                .in(VisDashboard::getId, dashboardIds));
        permissionTokenService.invalidateDashboardUsers(changedIds);
    }

    @Transactional(rollbackFor = Exception.class)
    public void toggleStatus(Long dashboardId) {
        VisDashboard row = requireDashboard(dashboardId);
        VisDashboard patch = new VisDashboard();
        patch.setId(dashboardId);
        patch.setStatus(FieldConst.EBL.equals(row.getStatus()) ? FieldConst.DBL : FieldConst.EBL);
        patch.modifyCallback();
        visDashboardMapper.updateById(patch);
        permissionTokenService.invalidateDashboardUsers(dashboardId);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(List<Long> ids) {
        permissionTokenService.invalidateDashboardUsers(ids);
        VisDashboard entity = new VisDashboard();
        entity.setStatus(FieldConst.DEL);
        entity.modifyCallback();
        visDashboardMapper.update(entity, Wrappers.<VisDashboard>lambdaUpdate()
                .ne(VisDashboard::getStatus, FieldConst.DEL)
                .in(VisDashboard::getId, ids));
        visDashboardCardMapper.delete(Wrappers.<VisDashboardCard>lambdaQuery()
                .in(VisDashboardCard::getDashboardId, ids));
        sysRoleDashboardMapper.delete(Wrappers.<SysRoleDashboard>lambdaQuery()
                .in(SysRoleDashboard::getDashboardId, ids));
    }

    private static boolean reportEntryChanged(VisDashboard previous, VisDashboard current) {
        return previous != null
                && (!Objects.equals(previous.getDashName(), current.getDashName())
                || !Objects.equals(StrUtil.blankToDefault(previous.getIcon(), null),
                StrUtil.blankToDefault(current.getIcon(), null))
                || normalizedGroupId(previous.getGroupId()) != normalizedGroupId(current.getGroupId())
                || !Objects.equals(previous.getStatus(), current.getStatus()));
    }

    private static long normalizedGroupId(Long groupId) {
        return groupId == null ? 0L : groupId;
    }

    private void replaceCards(Long dashboardId, List<Long> cardIds) {
        visDashboardCardMapper.delete(Wrappers.<VisDashboardCard>lambdaQuery()
                .eq(VisDashboardCard::getDashboardId, dashboardId));
        if (CollUtil.isEmpty(cardIds)) {
            return;
        }
        for (Long cardId : cardIds) {
            VisDashboardCard row = new VisDashboardCard()
                    .setDashboardId(dashboardId)
                    .setCardId(cardId);
            row.createCallback();
            visDashboardCardMapper.insert(row);
        }
    }

    private VisDashboardInfo toInfo(VisDashboard row, boolean withCards) {
        VisDashboardInfo info = BeanUtil.copyProperties(row, VisDashboardInfo.class);
        if (withCards) {
            info.setCards(listActivePlacements(row.getId()));
        }
        return info;
    }

    private void applyGroupFilter(LambdaQueryWrapper<VisDashboard> wrapper, Long groupId, Boolean includeDescendants) {
        if (groupId == null) {
            return;
        }
        if (groupId == 0 || Boolean.FALSE.equals(includeDescendants)) {
            wrapper.eq(VisDashboard::getGroupId, groupId);
            return;
        }
        wrapper.in(VisDashboard::getGroupId, dashGroupService.selfAndDescendantIds(groupId));
    }

    private void fillGroupNames(List<VisDashboardInfo> rows) {
        if (CollUtil.isEmpty(rows)) {
            return;
        }
        Set<Long> ids = rows.stream()
                .map(VisDashboardInfo::getGroupId)
                .filter(id -> id != null && id != 0)
                .collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return;
        }
        Map<Long, String> names = dashGroupMapper.selectList(Wrappers.<VisDashGroup>lambdaQuery()
                        .in(VisDashGroup::getId, ids)
                        .select(VisDashGroup::getId, VisDashGroup::getGroupName))
                .stream()
                .collect(Collectors.toMap(VisDashGroup::getId, VisDashGroup::getGroupName, (a, b) -> a));
        for (VisDashboardInfo row : rows) {
            if (row.getGroupId() != null) {
                row.setGroupName(names.get(row.getGroupId()));
            }
        }
    }

    private VisDashboard requireDashboard(Long dashboardId) {
        VisDashboard row = visDashboardMapper.selectById(dashboardId);
        if (row == null || FieldConst.DEL.equals(row.getStatus())) {
            throw fail("看板不存在");
        }
        return row;
    }

    private void requireCardsExist(List<Long> cardIds) {
        List<VisCard> rows = visCardMapper.selectList(Wrappers.<VisCard>lambdaQuery()
                .in(VisCard::getId, cardIds)
                .ne(VisCard::getStatus, FieldConst.DEL));
        Set<Long> found = rows.stream().map(VisCard::getId).collect(Collectors.toSet());
        for (Long cardId : cardIds) {
            if (!found.contains(cardId)) {
                throw fail("卡片不存在: " + cardId);
            }
        }
    }

    private List<VisDashboardLayoutItem> listActivePlacements(Long dashboardId) {
        List<VisDashboardCard> placements = listPlacements(dashboardId);
        if (CollUtil.isEmpty(placements)) {
            return Collections.emptyList();
        }
        List<Long> cardIds = placements.stream().map(VisDashboardCard::getCardId).collect(Collectors.toList());
        Map<Long, String> statusById = visCardMapper.selectList(Wrappers.<VisCard>lambdaQuery()
                        .in(VisCard::getId, cardIds)
                        .ne(VisCard::getStatus, FieldConst.DEL)
                        .select(VisCard::getId, VisCard::getStatus))
                .stream()
                .collect(Collectors.toMap(VisCard::getId, VisCard::getStatus, (a, b) -> a));
        List<VisDashboardLayoutItem> cards = new ArrayList<>();
        for (VisDashboardCard item : placements) {
            String status = statusById.get(item.getCardId());
            if (status == null) {
                continue;
            }
            VisDashboardLayoutItem layout = BeanUtil.copyProperties(item, VisDashboardLayoutItem.class);
            layout.setStatus(status);
            cards.add(layout);
        }
        return cards;
    }

    private List<VisDashboardCard> listPlacements(Long dashboardId) {
        return visDashboardCardMapper.selectList(
                Wrappers.<VisDashboardCard>lambdaQuery()
                        .eq(VisDashboardCard::getDashboardId, dashboardId)
                        .orderByAsc(VisDashboardCard::getId));
    }

    private static ResultException fail(String msg) {
        return new ResultException(ResultEnum.FAIL.getCode(), msg);
    }
}
