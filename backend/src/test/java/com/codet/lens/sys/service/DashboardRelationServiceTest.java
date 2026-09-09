package com.codet.lens.sys.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.codet.lens.common.base.PageCondition;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.sys.dto.role.DashboardRelations.*;
import com.codet.lens.sys.entity.*;
import com.codet.lens.sys.mapper.*;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DashboardRelationServiceTest {
    private final VisDashboardMapper dashboards = mock(VisDashboardMapper.class);
    private final SysRoleDashboardMapper links = mock(SysRoleDashboardMapper.class);
    private final SysRoleMapper roles = mock(SysRoleMapper.class);
    private final SysUserMapper users = mock(SysUserMapper.class);
    private final SysUserRoleMapper userRoles = mock(SysUserRoleMapper.class);
    private final PermissionTokenService tokens = mock(PermissionTokenService.class);
    private final DashboardRelationService service = new DashboardRelationService(dashboards, links, roles, users, userRoles, tokens);

    @Test
    void followsInclusiveValidityBoundariesAndDisabledRoles() {
        assertEquals("ACTIVE", DashboardRelationService.validity("EBL", null, null, 100));
        assertEquals("ACTIVE", DashboardRelationService.validity("EBL", 100L, 100L, 100));
        assertEquals("PENDING", DashboardRelationService.validity("EBL", 101L, null, 100));
        assertEquals("EXPIRED", DashboardRelationService.validity("EBL", null, 99L, 100));
        assertEquals("DISABLED", DashboardRelationService.validity("DBL", null, null, 100));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void returnsAllRoleSourcesForEachPagedUserWithoutSensitiveFields() {
        when(dashboards.selectById(30L)).thenReturn(new VisDashboard().setStatus(Status.EBL));
        SysRole first = role(1L, "销售", Status.EBL);
        SysRole second = role(2L, "管理", Status.DBL);
        when(roles.selectList(any())).thenReturn(List.of(first, second));
        SysUser user = new SysUser().setUsername("alice").setRealName("小李").setPassword("secret").setStatus(Status.EBL);
        user.setId(5L);
        Page<SysUser> page = new Page<>(2, 10, 12);
        page.setRecords(List.of(user));
        when(users.selectPage(any(IPage.class), any())).thenReturn(page);
        when(userRoles.selectList(any())).thenReturn(List.of(
                new SysUserRole().setUserId(5L).setRoleId(1L),
                new SysUserRole().setUserId(5L).setRoleId(2L).setEndAt(1L)));

        var result = service.queryUsers(query());

        assertEquals(12L, result.getTotal());
        assertEquals(1, result.getRecords().size());
        assertEquals(2, result.getRecords().getFirst().getRoles().size());
        assertEquals("DISABLED", result.getRecords().getFirst().getRoles().get(1).getValidity());
        assertFalse(java.util.Arrays.stream(UserInfo.class.getDeclaredFields()).anyMatch(field -> field.getName().equals("password")));
        ArgumentCaptor<QueryWrapper<SysUser>> wrapper = ArgumentCaptor.forClass(QueryWrapper.class);
        verify(users).selectPage(any(IPage.class), wrapper.capture());
        assertFalse(wrapper.getValue().getSqlSelect().contains("password"));
        assertTrue(wrapper.getValue().getSqlSegment().contains("EXISTS"));
        assertTrue(wrapper.getValue().getParamNameValuePairs().containsValue(30L));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void unlinkIsScopedAndIdempotentAndInvalidatesOnlyAffectedRole() {
        when(dashboards.selectById(30L)).thenReturn(new VisDashboard().setStatus(Status.EBL));
        when(links.delete(any())).thenReturn(1, 0);
        UnlinkRole request = new UnlinkRole();
        request.setDashboardId(30L);
        request.setRoleId(2L);

        service.unlinkRole(request);
        service.unlinkRole(request);

        verify(tokens, times(1)).invalidateRoleUsers(2L);
        verifyNoInteractions(userRoles, roles, users);
        ArgumentCaptor<QueryWrapper<SysRoleDashboard>> wrapper = ArgumentCaptor.forClass(QueryWrapper.class);
        verify(links, times(2)).delete(wrapper.capture());
        for (var query : wrapper.getAllValues()) {
            assertTrue(query.getSqlSegment().contains("dashboard_id"));
            assertTrue(query.getSqlSegment().contains("role_id"));
            assertTrue(query.getParamNameValuePairs().values().containsAll(List.of(30L, 2L)));
        }
    }

    @Test
    void rejectsMissingDashboardAndInvalidPaging() {
        assertThrows(ResultException.class, () -> service.queryUsers(query()));
        when(dashboards.selectById(30L)).thenReturn(new VisDashboard().setStatus(Status.DEL));
        assertThrows(ResultException.class, () -> service.listRoles(30L));
        when(dashboards.selectById(30L)).thenReturn(new VisDashboard().setStatus(Status.EBL));
        var request = query();
        request.getPage().pageSize = 0L;
        assertThrows(ResultException.class, () -> service.queryUsers(request));
        verifyNoInteractions(users, links);
    }

    private static QueryUsers query() {
        QueryUsers query = new QueryUsers();
        query.setDashboardId(30L);
        query.setPage(new PageCondition());
        return query;
    }

    private static SysRole role(Long id, String name, String status) {
        SysRole role = new SysRole().setRoleName(name).setStatus(status);
        role.setId(id);
        return role;
    }
}
