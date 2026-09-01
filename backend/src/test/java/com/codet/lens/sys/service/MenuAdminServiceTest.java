package com.codet.lens.sys.service;

import com.codet.lens.common.base.Status;
import com.codet.lens.sys.dto.menu.SaveMenuRequest;
import com.codet.lens.sys.entity.SysMenu;
import com.codet.lens.sys.mapper.SysMenuMapper;
import com.codet.lens.sys.mapper.SysRoleMenuMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MenuAdminServiceTest {

    private final SysMenuMapper menuMapper = mock(SysMenuMapper.class);
    private final SysRoleMenuMapper roleMenuMapper = mock(SysRoleMenuMapper.class);
    private final PermissionTokenService permissionTokenService = mock(PermissionTokenService.class);
    private final MenuAdminService service =
            new MenuAdminService(menuMapper, roleMenuMapper, permissionTokenService);

    @Test
    void invalidatesUsersWhenFunctionPermissionChanges() {
        when(menuMapper.selectById(100L)).thenReturn(functionMenu("old:code"));

        service.save(saveRequest("new:code", "功能新名称"));

        verify(permissionTokenService).invalidateMenuUsers(100L);
    }

    @Test
    void doesNotInvalidateUsersForDisplayOnlyChanges() {
        when(menuMapper.selectById(100L)).thenReturn(functionMenu("same:code"));

        service.save(saveRequest("same:code", "只改名称"));

        verify(permissionTokenService, never()).invalidateMenuUsers(100L);
    }

    @Test
    void preservesDisabledStatusWhenEditOmitsStatus() {
        SysMenu menu = functionMenu("same:code");
        menu.setStatus(Status.DBL);
        when(menuMapper.selectById(100L)).thenReturn(menu);
        SaveMenuRequest request = saveRequest("same:code", "只改名称");
        request.setStatus(null);

        service.save(request);

        assertEquals(Status.DBL, menu.getStatus());
        verify(permissionTokenService, never()).invalidateMenuUsers(100L);
    }

    private static SysMenu functionMenu(String permCode) {
        SysMenu menu = new SysMenu();
        menu.setId(100L);
        menu.setPid(1L);
        menu.setMenuName("功能");
        menu.setMenuType("FUNC");
        menu.setPermCode(permCode);
        menu.setStatus(Status.EBL);
        return menu;
    }

    private static SaveMenuRequest saveRequest(String permCode, String name) {
        SaveMenuRequest request = new SaveMenuRequest();
        request.setId(100L);
        request.setPid(1L);
        request.setMenuName(name);
        request.setMenuType("FUNC");
        request.setPermCode(permCode);
        request.setStatus(Status.EBL);
        return request;
    }
}
