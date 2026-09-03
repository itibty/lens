package com.codet.lens.sys.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.sys.dto.menu.SaveMenuRequest;
import com.codet.lens.sys.entity.SysMenu;
import com.codet.lens.sys.mapper.SysMenuMapper;
import com.codet.lens.sys.mapper.SysRoleMenuMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
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

    @BeforeEach
    void mockRootMenu() {
        when(menuMapper.selectById(1L)).thenReturn(menu(1L, 0L, "MENU"));
    }

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
    void rejectsFunctionAsParent() {
        when(menuMapper.selectById(2L)).thenReturn(menu(2L, 1L, "FUNC"));
        SaveMenuRequest request = saveRequest("code", "功能");
        request.setId(null);
        request.setPid(2L);

        assertThrows(ResultException.class, () -> service.save(request));
    }

    @Test
    void rejectsMovingMenuUnderItsDescendant() {
        when(menuMapper.selectById(100L)).thenReturn(menu(100L, 1L, "MENU"));
        when(menuMapper.selectById(200L)).thenReturn(menu(200L, 100L, "MENU"));
        SaveMenuRequest request = saveRequest(null, "目录");
        request.setMenuType("MENU");
        request.setPid(200L);

        assertThrows(ResultException.class, () -> service.save(request));
    }

    @Test
    void rejectsChangingParentMenuWithChildrenToFunction() {
        when(menuMapper.selectById(100L)).thenReturn(menu(100L, 1L, "MENU"));
        when(menuMapper.selectCount(any())).thenReturn(1L);

        assertThrows(ResultException.class, () -> service.save(saveRequest("perm", "功能")));
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

    private static SysMenu menu(Long id, Long pid, String type) {
        SysMenu menu = new SysMenu();
        menu.setId(id);
        menu.setPid(pid);
        menu.setMenuType(type);
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
