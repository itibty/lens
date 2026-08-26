package com.codet.lens.auth;

import com.codet.lens.common.FieldConst;
import com.codet.lens.common.R;
import com.codet.lens.common.ResultEnum;
import tools.jackson.databind.json.JsonMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private final JwtService jwtService;
    private final JsonMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod method)) {
            return true;
        }
        if (method.hasMethodAnnotation(PublicAccess.class)
                || method.getBeanType().isAnnotationPresent(PublicAccess.class)) {
            return true;
        }
        String header = request.getHeader(FieldConst.AUTHORIZATION);
        String token = header == null ? null : header.startsWith(FieldConst.TOKEN_PREFIX)
                ? header.substring(FieldConst.TOKEN_PREFIX.length())
                : header;
        AuthUser user = token == null ? null : jwtService.parse(token);
        if (user == null) {
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
