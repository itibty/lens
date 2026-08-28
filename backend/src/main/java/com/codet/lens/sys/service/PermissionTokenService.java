package com.codet.lens.sys.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.codet.lens.auth.TokenInvalidateService;
import com.codet.lens.sys.entity.SysRoleDashboard;
import com.codet.lens.sys.entity.SysRoleMenu;
import com.codet.lens.sys.entity.SysUserRole;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.sys.mapper.SysRoleMenuMapper;
import com.codet.lens.sys.mapper.SysUserRoleMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionTokenService {

    private final SysRoleMenuMapper roleMenuMapper;
    private final SysRoleDashboardMapper roleDashboardMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final TokenInvalidateService tokenInvalidateService;

    public void invalidateMenuUsers(Long menuId) {
        Set<Long> roleIds = roleMenuMapper.selectList(new QueryWrapper<SysRoleMenu>()
                        .eq("menu_id", menuId)
                        .select("role_id"))
                .stream()
                .map(SysRoleMenu::getRoleId)
                .collect(Collectors.toSet());
        invalidateRoleUsers(roleIds);
    }

    public void invalidateDashboardUsers(Long dashboardId) {
        if (dashboardId == null) {
            return;
        }
        invalidateDashboardUsers(Set.of(dashboardId));
    }

    public void invalidateDashboardUsers(Collection<Long> dashboardIds) {
        if (dashboardIds == null || dashboardIds.isEmpty()) {
            return;
        }
        Set<Long> ids = dashboardIds.stream().filter(id -> id != null).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return;
        }
        Set<Long> roleIds = roleDashboardMapper.selectList(new QueryWrapper<SysRoleDashboard>()
                        .in("dashboard_id", ids)
                        .select("role_id"))
                .stream()
                .map(SysRoleDashboard::getRoleId)
                .collect(Collectors.toSet());
        invalidateRoleUsers(roleIds);
    }

    public void invalidateRoleUsers(Long roleId) {
        invalidateRoleUsers(Set.of(roleId));
    }

    public void invalidateRoleUsers(Collection<Long> roleIds) {
        if (roleIds == null || roleIds.isEmpty()) {
            return;
        }
        Set<Long> userIds = userRoleMapper.selectList(new QueryWrapper<SysUserRole>()
                        .in("role_id", roleIds)
                        .select("user_id"))
                .stream()
                .map(SysUserRole::getUserId)
                .collect(Collectors.toSet());
        userIds.forEach(tokenInvalidateService::invalidate);
    }
}
