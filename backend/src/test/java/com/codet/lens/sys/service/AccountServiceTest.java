package com.codet.lens.sys.service;

import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.auth.AuthUser;
import com.codet.lens.common.auth.JwtService;
import com.codet.lens.common.auth.TokenInvalidateService;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.Status;
import com.codet.lens.common.config.LensProperties;
import com.codet.lens.sys.dto.auth.AccountInfo;
import com.codet.lens.sys.dto.auth.UserMenu;
import com.codet.lens.sys.entity.SysMenu;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.mapper.SysMenuMapper;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.vis.service.VisDashGroupService;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AccountServiceTest {

    private final SysUserMapper userMapper = mock(SysUserMapper.class);
    private final SysMenuMapper menuMapper = mock(SysMenuMapper.class);
    private final VisDashGroupService dashGroupService = mock(VisDashGroupService.class);
    private final AccountService service = new AccountService(
            userMapper,
            menuMapper,
            dashGroupService,
            mock(JwtService.class),
            mock(TokenInvalidateService.class),
            new LensProperties()
    );

    @AfterEach
    void clearAuth() {
        AuthContext.clear();
    }

    @Test
    void usesDefaultTtlWhenRolesHaveNoEnd() {
        assertEquals(13_000L, AccountService.resolveTokenExpiresAt(1_000L, 12_000L, null));
    }

    @Test
    void capsTokenAtEarliestRoleEnd() {
        assertEquals(5_000L, AccountService.resolveTokenExpiresAt(1_000L, 12_000L, 5_000L));
    }

    @Test
    void keepsDefaultTtlWhenRoleEndsLater() {
        assertEquals(13_000L, AccountService.resolveTokenExpiresAt(1_000L, 12_000L, 20_000L));
    }

    @Test
    void currentUsesJwtRolesAndPerms() {
        bindAuth("1", Set.of("analyst"), Set.of("vis:card:conf"));
        SysUser user = new SysUser();
        user.setId(1L);
        user.setUsername("ann");
        user.setRealName("安");
        user.setStatus(Status.EBL);
        when(userMapper.selectById(1L)).thenReturn(user);
        when(userMapper.findRoleCodes(any(), any())).thenReturn(List.of("should-not-use"));
        when(userMapper.findPermCodes(any(), any())).thenReturn(List.of("should-not-use"));

        AccountInfo info = service.current().getInfo();

        assertEquals(Set.of("analyst"), info.getRoleCodes());
        assertEquals(Set.of("vis:card:conf"), info.getFunctionCodes());
        verify(userMapper, never()).findRoleCodes(any(), any());
        verify(userMapper, never()).findPermCodes(any(), any());
    }

    @Test
    void menusUsesJwtRolesAndSkipsEmptyRoleQuery() {
        bindAuth("1", Set.of(), Set.of());
        when(menuMapper.selectList(any())).thenReturn(List.of(menu(10L, 0L, "MENU", "系统")));
        when(dashGroupService.reportTree()).thenReturn(new ListResponse<>(List.of()));

        List<UserMenu> menus = service.menus().getList();

        assertTrue(menus.stream().noneMatch(item -> "系统".equals(item.getName())));
        verify(menuMapper, never()).findFuncsByRoleCodes(any());
    }

    @Test
    void menusLoadsFuncsByJwtRoleCodes() {
        bindAuth("1", Set.of("analyst"), Set.of());
        SysMenu parent = menu(10L, 0L, "MENU", "数据集");
        parent.setRoutePath("/ds");
        when(menuMapper.selectList(any())).thenReturn(List.of(parent));
        when(menuMapper.findFuncsByRoleCodes(Set.of("analyst"))).thenReturn(List.of(menu(11L, 10L, "FUNC", "配置")));
        when(dashGroupService.reportTree()).thenReturn(new ListResponse<>(List.of()));

        List<UserMenu> menus = service.menus().getList();

        assertTrue(menus.stream().anyMatch(item -> "数据集".equals(item.getName())));
        verify(menuMapper).findFuncsByRoleCodes(Set.of("analyst"));
    }

    private static void bindAuth(String userId, Set<String> roles, Set<String> perms) {
        AuthUser auth = new AuthUser();
        auth.setSubject(userId);
        auth.setRoles(new HashSet<>(roles));
        auth.setPerms(new HashSet<>(perms));
        AuthContext.set(auth);
    }

    private static SysMenu menu(Long id, Long pid, String type, String name) {
        SysMenu menu = new SysMenu();
        menu.setId(id);
        menu.setPid(pid);
        menu.setMenuType(type);
        menu.setMenuName(name);
        menu.setStatus(Status.EBL);
        return menu;
    }
}
