package com.codet.lens.sys.service;

import com.codet.lens.common.FieldConst;
import com.codet.lens.sys.dto.SysDtos.ResetRoleDashboardsRequest;
import com.codet.lens.sys.dto.SysDtos.SaveRoleRequest;
import com.codet.lens.sys.entity.SysRole;
import com.codet.lens.sys.mapper.SysMenuMapper;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.sys.mapper.SysRoleMapper;
import com.codet.lens.sys.mapper.SysRoleMenuMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RoleAdminServiceTest {

    private final SysRoleMapper roleMapper = mock(SysRoleMapper.class);
    private final PermissionTokenService permissionTokenService = mock(PermissionTokenService.class);
    private final RoleAdminService service = new RoleAdminService(
            roleMapper,
            mock(SysRoleMenuMapper.class),
            mock(SysRoleDashboardMapper.class),
            mock(SysMenuMapper.class),
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
        role.setStatus(FieldConst.DBL);
        when(roleMapper.selectById(10L)).thenReturn(role);
        SaveRoleRequest request = saveRequest("same-code", "只改名称");
        request.setStatus(null);

        service.save(request);

        assertEquals(FieldConst.DBL, role.getStatus());
        verify(permissionTokenService, never()).invalidateRoleUsers(10L);
    }

    @Test
    void invalidatesUsersWhenRoleDashboardsChange() {
        when(roleMapper.selectById(10L)).thenReturn(role("same-code"));

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

    private static SysRole role(String roleCode) {
        SysRole role = new SysRole();
        role.setId(10L);
        role.setRoleName("角色");
        role.setRoleCode(roleCode);
        role.setStatus(FieldConst.EBL);
        return role;
    }

    private static SaveRoleRequest saveRequest(String roleCode, String roleName) {
        SaveRoleRequest request = new SaveRoleRequest();
        request.setId(10L);
        request.setRoleName(roleName);
        request.setRoleCode(roleCode);
        request.setStatus(FieldConst.EBL);
        return request;
    }
}
