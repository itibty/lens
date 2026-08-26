package com.codet.lens.vis.service;

import com.codet.lens.auth.AuthContext;
import com.codet.lens.auth.AuthUser;
import com.codet.lens.common.PermCodes;
import com.codet.lens.common.ResultEnum;
import com.codet.lens.common.ResultException;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class VisDashboardAccess {

    private final SysRoleDashboardMapper roleDashboardMapper;

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

    public void assertCanUseVisQuery() {
        if (canDesign())
            return;
        if (assignedIds().isEmpty())
            throw denied("无权限");
    }

    private boolean canDesign() {
        AuthUser user = AuthContext.get();
        return user != null && user.hasAnyPerm(
                PermCodes.DS_CARD_QUERY, PermCodes.DS_CARD_WRITE,
                PermCodes.DS_DASHBOARD_QUERY, PermCodes.DS_DASHBOARD_WRITE);
    }

    private Set<Long> assignedIds() {
        Long userId = AuthContext.getUserIdLong();
        if (userId == null)
            return Set.of();
        List<Long> ids = roleDashboardMapper.findUserDashboardIds(userId, System.currentTimeMillis());
        return ids == null ? Set.of() : new HashSet<>(ids);
    }

    private static ResultException denied(String msg) {
        return new ResultException(ResultEnum.ERROR403.getCode(), msg);
    }
}
