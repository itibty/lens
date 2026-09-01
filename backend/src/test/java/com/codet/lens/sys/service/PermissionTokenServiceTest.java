package com.codet.lens.sys.service;

import com.codet.lens.common.auth.TokenInvalidateService;
import com.codet.lens.sys.entity.SysRoleDashboard;
import com.codet.lens.sys.entity.SysRoleMenu;
import com.codet.lens.sys.entity.SysUserRole;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.sys.mapper.SysRoleMenuMapper;
import com.codet.lens.sys.mapper.SysUserRoleMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PermissionTokenServiceTest {

    private final SysRoleMenuMapper roleMenuMapper = mock(SysRoleMenuMapper.class);
    private final SysRoleDashboardMapper roleDashboardMapper = mock(SysRoleDashboardMapper.class);
    private final SysUserRoleMapper userRoleMapper = mock(SysUserRoleMapper.class);
    private final TokenInvalidateService tokenInvalidateService = mock(TokenInvalidateService.class);
    private final PermissionTokenService service =
            new PermissionTokenService(roleMenuMapper, roleDashboardMapper, userRoleMapper, tokenInvalidateService);

    @Test
    void invalidatesDistinctUsersAssignedThroughMenuRoles() {
        when(roleMenuMapper.selectList(any())).thenReturn(List.of(
                new SysRoleMenu().setRoleId(10L),
                new SysRoleMenu().setRoleId(20L)));
        when(userRoleMapper.selectList(any())).thenReturn(List.of(
                new SysUserRole().setUserId(1L),
                new SysUserRole().setUserId(1L),
                new SysUserRole().setUserId(2L)));

        service.invalidateMenuUsers(100L);

        verify(tokenInvalidateService).invalidate(1L);
        verify(tokenInvalidateService).invalidate(2L);
    }

    @Test
    void skipsUserLookupWhenMenuHasNoRoles() {
        when(roleMenuMapper.selectList(any())).thenReturn(List.of());

        service.invalidateMenuUsers(100L);

        verify(userRoleMapper, never()).selectList(any());
        verify(tokenInvalidateService, never()).invalidate(any());
    }

    @Test
    void invalidatesDistinctUsersAssignedThroughDashboardRoles() {
        when(roleDashboardMapper.selectList(any())).thenReturn(List.of(
                new SysRoleDashboard().setRoleId(10L),
                new SysRoleDashboard().setRoleId(20L)));
        when(userRoleMapper.selectList(any())).thenReturn(List.of(
                new SysUserRole().setUserId(1L),
                new SysUserRole().setUserId(1L),
                new SysUserRole().setUserId(2L)));

        service.invalidateDashboardUsers(9501L);

        verify(tokenInvalidateService).invalidate(1L);
        verify(tokenInvalidateService).invalidate(2L);
    }

    @Test
    void skipsUserLookupWhenDashboardHasNoRoles() {
        when(roleDashboardMapper.selectList(any())).thenReturn(List.of());

        service.invalidateDashboardUsers(9501L);

        verify(userRoleMapper, never()).selectList(any());
        verify(tokenInvalidateService, never()).invalidate(any());
    }
}
