package com.codet.lens.sys.controller;

import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.auth.AuthInterceptor;
import com.codet.lens.common.auth.AuthUser;
import com.codet.lens.common.auth.JwtService;
import com.codet.lens.common.auth.TokenInvalidateService;
import com.codet.lens.sys.SysPerms;
import com.codet.lens.sys.dto.role.DashboardRelations;
import com.codet.lens.sys.service.DashboardRelationService;
import com.codet.lens.vis.VisPerms;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DashboardRelationControllerTest {
    private final JwtService jwt = mock(JwtService.class);
    private final TokenInvalidateService tokens = mock(TokenInvalidateService.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final AuthInterceptor interceptor = new AuthInterceptor(jwt, tokens, mapper);
    private final DashboardRelationController controller = new DashboardRelationController(mock(DashboardRelationService.class));

    @AfterEach
    void clearContext() {
        AuthContext.clear();
    }

    @Test
    void designPermissionAloneCannotReadUsersRolesOrUnlink() throws Exception {
        assertDenied("listRoles", Long.class, Set.of(VisPerms.VIS_DASHBOARD_CONF));
        assertDenied("queryUsers", DashboardRelations.QueryUsers.class, Set.of(VisPerms.VIS_DASHBOARD_CONF));
        assertDenied("unlinkRole", DashboardRelations.UnlinkRole.class,
                Set.of(VisPerms.VIS_DASHBOARD_CONF, SysPerms.SYS_ROLE_QUERY, SysPerms.SYS_USER_QUERY));
    }

    @Test
    void usesExistingSystemPermissionsForEachOperation() throws Exception {
        assertTrue(allowed("listRoles", Long.class, Set.of(SysPerms.SYS_ROLE_QUERY), new MockHttpServletResponse()));
        assertTrue(allowed("queryUsers", DashboardRelations.QueryUsers.class,
                Set.of(SysPerms.SYS_USER_QUERY), new MockHttpServletResponse()));
        assertTrue(allowed("unlinkRole", DashboardRelations.UnlinkRole.class,
                Set.of(SysPerms.SYS_ROLE_WRITE), new MockHttpServletResponse()));
    }

    private void assertDenied(String name, Class<?> arg, Set<String> perms) throws Exception {
        var response = new MockHttpServletResponse();
        assertFalse(allowed(name, arg, perms, response));
        assertEquals(403, mapper.readTree(response.getContentAsString()).path("code").asInt());
    }

    private boolean allowed(String name, Class<?> arg, Set<String> perms, MockHttpServletResponse response) throws Exception {
        var request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer test-token");
        when(jwt.parse("test-token")).thenReturn(new AuthUser().setSubject("1").setPerms(perms));
        return interceptor.preHandle(request, response,
                new HandlerMethod(controller, DashboardRelationController.class.getMethod(name, arg)));
    }
}
