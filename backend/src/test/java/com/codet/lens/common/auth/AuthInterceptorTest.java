package com.codet.lens.common.auth;

import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthInterceptorTest {

    private final JwtService jwtService = mock(JwtService.class);
    private final TokenInvalidateService tokenInvalidateService = mock(TokenInvalidateService.class);
    private final AuthInterceptor interceptor = new AuthInterceptor(
            jwtService, tokenInvalidateService, mock(JsonMapper.class));

    @AfterEach
    void clearContext() {
        AuthContext.clear();
    }

    @Test
    void clearsStaleContextBeforeNonControllerRequest() throws Exception {
        AuthContext.set(user("old-user", Set.of("old:perm")));
        AuthContext.setToken("old-token");

        assertTrue(interceptor.preHandle(
                new MockHttpServletRequest(), new MockHttpServletResponse(), new Object()));

        assertNull(AuthContext.get());
        assertNull(AuthContext.getToken());
    }

    @Test
    void clearsContextImmediatelyWhenPermissionIsRejected() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer token");
        AuthUser user = user("10", Set.of());
        when(jwtService.parse("token")).thenReturn(user);
        when(tokenInvalidateService.isInvalidated(user)).thenReturn(false);

        boolean allowed = interceptor.preHandle(request, new MockHttpServletResponse(),
                handler("secured"));

        assertFalse(allowed);
        assertNull(AuthContext.get());
        assertNull(AuthContext.getToken());
    }

    private static AuthUser user(String subject, Set<String> perms) {
        return new AuthUser().setSubject(subject).setPerms(perms);
    }

    private static HandlerMethod handler(String name) throws NoSuchMethodException {
        return new HandlerMethod(new TestController(), TestController.class.getDeclaredMethod(name));
    }

    private static class TestController {
        @Permission("required:perm")
        public void secured() {
        }
    }
}
