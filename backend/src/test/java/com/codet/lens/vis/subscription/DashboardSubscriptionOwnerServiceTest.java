package com.codet.lens.vis.subscription;

import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.auth.AuthUser;
import com.codet.lens.common.auth.JwtService;
import com.codet.lens.common.base.Status;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.vis.service.VisDashboardAccess;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardSubscriptionOwnerServiceTest {
    private final SysUserMapper userMapper = mock(SysUserMapper.class);
    private final VisDashboardAccess dashboardAccess = mock(VisDashboardAccess.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final DashboardSubscriptionOwnerService service =
            new DashboardSubscriptionOwnerService(userMapper, dashboardAccess, jwtService);

    @AfterEach
    void clearAuth() {
        AuthContext.clear();
    }

    @Test
    void checksCurrentOwnerPermissionsAndRestoresCallingContext() {
        AuthUser caller = new AuthUser().setSubject("99");
        AuthContext.set(caller);
        AuthContext.setToken("Bearer caller-token");
        SysUser owner = new SysUser().setEmail("owner@example.com").setStatus(Status.EBL);
        owner.setId(7L);
        when(userMapper.selectById(7L)).thenReturn(owner);
        when(userMapper.findRoleCodes(eq(7L), anyLong())).thenReturn(List.of("viewer"));
        when(userMapper.findPermCodes(eq(7L), anyLong())).thenReturn(List.of("report:view"));
        when(userMapper.findEarliestRoleEndAt(eq(7L), anyLong())).thenReturn(null);
        when(jwtService.createToken(eq("7"), any(), any(), anyLong())).thenReturn("render-token");

        DashboardSubscriptionOwnerService.OwnerSession session = service.prepare(7L, 9L);

        assertEquals("owner@example.com", session.email());
        assertEquals("Bearer render-token", session.authorization());
        assertSame(caller, AuthContext.get());
        assertEquals("Bearer caller-token", AuthContext.getToken());
        verify(dashboardAccess).assertCanView(9L);
    }
}
