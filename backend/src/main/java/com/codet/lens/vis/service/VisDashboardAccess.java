package com.codet.lens.vis.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.auth.AuthUser;
import com.codet.lens.common.base.ResultEnum;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.vis.entity.VisDashboardCard;
import com.codet.lens.vis.mapper.VisDashboardCardMapper;
import com.codet.lens.vis.VisPerms;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VisDashboardAccess {

    private final SysRoleDashboardMapper roleDashboardMapper;
    private final VisDashboardCardMapper dashboardCardMapper;
    private final VisDashboardVisibilityService dashboardVisibility;

    public void assertCanView(Long dashboardId) {
        if (canDesign())
            return;
        if (dashboardId == null || dashboardId == 0)
            throw denied("无权限查看该看板");
        if (!assignedIds().contains(dashboardId))
            throw denied("无权限查看该看板");
    }

    public void assertCanQueryCard(Long dashboardId) {
        if (dashboardId == null || dashboardId == 0) {
            if (!canDesign())
                throw denied("无权限");
            return;
        }
        assertCanView(dashboardId);
    }

    /**
     * 卡片详情：设计权限可看任意卡；否则这张卡必须挂在当前用户已分配的看板上。
     * 不要求 vis:card:conf，报表中心只读配置也能拉卡。
     */
    public void assertCanViewCard(Long cardId) {
        if (canDesign())
            return;
        if (cardId == null || cardId == 0)
            throw denied("无权限查看该卡片");
        List<VisDashboardCard> links = dashboardCardMapper.selectList(Wrappers.<VisDashboardCard>lambdaQuery()
                .eq(VisDashboardCard::getCardId, cardId)
                .select(VisDashboardCard::getDashboardId));
        Set<Long> assigned = assignedIds();
        for (VisDashboardCard link : links) {
            if (link.getDashboardId() != null && assigned.contains(link.getDashboardId()))
                return;
        }
        throw denied("无权限查看该卡片");
    }

    public void assertCanUseVisQuery() {
        if (canDesign())
            return;
        if (assignedIds().isEmpty())
            throw denied("无权限");
    }

    public boolean canDesign() {
        AuthUser user = AuthContext.get();
        return user != null && user.hasAnyPerm(
                VisPerms.VIS_CARD_CONF, VisPerms.VIS_DASHBOARD_CONF);
    }

    public Set<Long> assignedDashboardIds() {
        AuthUser user = AuthContext.get();
        Set<String> roleCodes = user == null ? Set.of() : user.getRoles();
        if (roleCodes == null || roleCodes.isEmpty())
            return Set.of();
        List<Long> ids = roleDashboardMapper.findDashboardIdsByRoleCodes(roleCodes);
        return ids == null
                ? Set.of()
                : dashboardVisibility.filterVisibleDashboardIds(new HashSet<>(ids));
    }

    private Set<Long> assignedIds() {
        return assignedDashboardIds();
    }

    private static ResultException denied(String msg) {
        return new ResultException(ResultEnum.ERROR403.getCode(), msg);
    }
}
