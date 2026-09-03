package com.codet.lens.sys.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.sys.dto.role.ResetRoleDashboardsRequest;
import com.codet.lens.sys.dto.role.ResetRoleMenusRequest;
import com.codet.lens.sys.dto.role.SaveRoleRequest;
import com.codet.lens.sys.entity.SysMenu;
import com.codet.lens.sys.entity.SysRole;
import com.codet.lens.sys.entity.SysRoleDashboard;
import com.codet.lens.sys.entity.SysRoleMenu;
import com.codet.lens.sys.mapper.SysMenuMapper;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.sys.mapper.SysRoleMapper;
import com.codet.lens.sys.mapper.SysRoleMenuMapper;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RoleAdminServiceTest {

    private final SysRoleMapper roleMapper = mock(SysRoleMapper.class);
    private final SysMenuMapper menuMapper = mock(SysMenuMapper.class);
    private final VisDashboardMapper dashboardMapper = mock(VisDashboardMapper.class);
    private final SysRoleMenuMapper roleMenuMapper = mock(SysRoleMenuMapper.class);
    private final SysRoleDashboardMapper roleDashboardMapper = mock(SysRoleDashboardMapper.class);
    private final PermissionTokenService permissionTokenService = mock(PermissionTokenService.class);
    private final RoleAdminService service = new RoleAdminService(
            roleMapper,
            roleMenuMapper,
            roleDashboardMapper,
            menuMapper,
            dashboardMapper,
            permissionTokenService);

    @Test
    void invalidatesUsersWhenRoleCodeChanges() {
        when(roleMapper.selectById(10L)).thenReturn(role("old-code"));

        service.save(saveRequest("new-code", "角色新名称"));

        verify(permissionTokenService).invalidateRoleUsers(10L);
    }

    @Test
    void doesNotInvalidateUsersForDisplayOnlyChanges() {
        when(roleMapper.selectById(10L)).thenReturn(role("same-code"));

        service.save(saveRequest("same-code", "只改名称"));

        verify(permissionTokenService, never()).invalidateRoleUsers(10L);
    }

    @Test
    void preservesDisabledStatusWhenEditOmitsStatus() {
        SysRole role = role("same-code");
        role.setStatus(Status.DBL);
        when(roleMapper.selectById(10L)).thenReturn(role);
        SaveRoleRequest request = saveRequest("same-code", "只改名称");
        request.setStatus(null);

        service.save(request);

        assertEquals(Status.DBL, role.getStatus());
        verify(permissionTokenService, never()).invalidateRoleUsers(10L);
    }

    @Test
    void invalidatesUsersWhenRoleDashboardsChange() {
        when(roleMapper.selectById(10L)).thenReturn(role("same-code"));
        when(dashboardMapper.selectBatchIds(any())).thenReturn(List.of(dashboard(9501L)));

        ResetRoleDashboardsRequest request = new ResetRoleDashboardsRequest();
        request.setRoleId(10L);
        request.setDashboardIds(List.of(9501L));
        service.resetDashboards(request);

        verify(permissionTokenService).invalidateRoleUsers(10L);
    }

    @Test
    void invalidatesUsersWhenRoleDashboardsCleared() {
        when(roleMapper.selectById(10L)).thenReturn(role("same-code"));

        ResetRoleDashboardsRequest request = new ResetRoleDashboardsRequest();
        request.setRoleId(10L);
        request.setDashboardIds(List.of());
        service.resetDashboards(request);

        verify(permissionTokenService).invalidateRoleUsers(10L);
    }

    @Test
    void rejectsMissingDashboardBeforeReplacingAssignments() {
        when(roleMapper.selectById(10L)).thenReturn(role("same-code"));
        ResetRoleDashboardsRequest request = new ResetRoleDashboardsRequest();
        request.setRoleId(10L);
        request.setDashboardIds(List.of(9501L));

        assertThrows(ResultException.class, () -> service.resetDashboards(request));

        verify(roleDashboardMapper, never()).delete(any());
    }

    @Test
    void rejectsInvalidMenuBeforeReplacingAssignments() {
        when(roleMapper.selectById(10L)).thenReturn(role("same-code"));
        when(menuMapper.selectBatchIds(any())).thenReturn(List.of());
        ResetRoleMenusRequest request = new ResetRoleMenusRequest();
        request.setRoleId(10L);
        request.setMenuIds(List.of(100L));

        assertThrows(ResultException.class, () -> service.resetMenus(request));

        verify(roleMenuMapper, never()).delete(any());
    }

    @Test
    void deduplicatesDashboardAssignments() {
        when(roleMapper.selectById(10L)).thenReturn(role("same-code"));
        when(dashboardMapper.selectBatchIds(any())).thenReturn(List.of(dashboard(9501L)));
        ResetRoleDashboardsRequest request = new ResetRoleDashboardsRequest();
        request.setRoleId(10L);
        request.setDashboardIds(List.of(9501L, 9501L));

        service.resetDashboards(request);

        verify(roleDashboardMapper, times(1)).insert(any(SysRoleDashboard.class));
    }

    @Test
    void deduplicatesMenuAssignments() {
        when(roleMapper.selectById(10L)).thenReturn(role("same-code"));
        SysMenu menu = new SysMenu();
        menu.setId(100L);
        menu.setMenuType("FUNC");
        menu.setStatus(Status.EBL);
        when(menuMapper.selectBatchIds(any())).thenReturn(List.of(menu));
        ResetRoleMenusRequest request = new ResetRoleMenusRequest();
        request.setRoleId(10L);
        request.setMenuIds(List.of(100L, 100L));

        service.resetMenus(request);

        verify(roleMenuMapper, times(1)).insert(any(SysRoleMenu.class));
    }

    private static SysRole role(String roleCode) {
        SysRole role = new SysRole();
        role.setId(10L);
        role.setRoleName("角色");
        role.setRoleCode(roleCode);
        role.setStatus(Status.EBL);
        return role;
    }

    private static VisDashboard dashboard(Long id) {
        VisDashboard dashboard = new VisDashboard().setStatus(Status.EBL);
        dashboard.setId(id);
        return dashboard;
    }

    private static SaveRoleRequest saveRequest(String roleCode, String roleName) {
        SaveRoleRequest request = new SaveRoleRequest();
        request.setId(10L);
        request.setRoleName(roleName);
        request.setRoleCode(roleCode);
        request.setStatus(Status.EBL);
        return request;
    }
}
