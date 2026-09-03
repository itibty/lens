package com.codet.lens.common.auth;

import com.codet.lens.common.base.R;
import com.codet.lens.common.base.ResultEnum;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import tools.jackson.databind.json.JsonMapper;

@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtService jwtService;
    private final TokenInvalidateService tokenInvalidateService;
    private final JsonMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        AuthContext.clear();
        if (!(handler instanceof HandlerMethod method)) {
            return true;
        }
        if (method.hasMethodAnnotation(PublicAccess.class)
                || method.getBeanType().isAnnotationPresent(PublicAccess.class)) {
            return true;
        }
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        String token = header == null ? null : header.startsWith("Bearer ")
                ? header.substring("Bearer ".length())
                : header;
        AuthUser user = token == null ? null : jwtService.parse(token);
        if (user == null || tokenInvalidateService.isInvalidated(user)) {
            write(response, ResultEnum.ERROR401);
            return false;
        }
        AuthContext.set(user);
        AuthContext.setToken(header);
        Permission perm = method.getMethodAnnotation(Permission.class);
        if (perm == null) {
            perm = method.getBeanType().getAnnotation(Permission.class);
        }
        if (perm != null && perm.value().length > 0 && !user.hasAnyPerm(perm.value())) {
            AuthContext.clear();
            write(response, ResultEnum.ERROR403);
            return false;
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        AuthContext.clear();
    }

    private void write(HttpServletResponse response, ResultEnum result) throws Exception {
        response.setStatus(200);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), R.fail(result.getCode(), result.getMsg()));
    }
}
