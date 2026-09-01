package com.codet.lens.common.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.ServletException;
import java.io.IOException;
import java.util.Locale;
import org.springframework.core.annotation.Order;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AppRoutingFilter extends OncePerRequestFilter {

    private static final String API_PREFIX = "/api";

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String path = request.getServletPath();
        if (isApiPath(path)) {
            filterChain.doFilter(new ApiPathRequest(request, stripApiPrefix(path)), response);
            return;
        }
        if (isSpaNavigation(request, path)) {
            request.getRequestDispatcher("/index.html").forward(request, response);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isApiPath(String path) {
        return API_PREFIX.equals(path) || path.startsWith(API_PREFIX + "/");
    }

    private String stripApiPrefix(String path) {
        String stripped = path.substring(API_PREFIX.length());
        return stripped.isEmpty() ? "/" : stripped;
    }

    private boolean isSpaNavigation(HttpServletRequest request, String path) {
        if (!HttpMethod.GET.matches(request.getMethod())
                || isBackendResource(path)
                || hasFileExtension(path)) {
            return false;
        }
        String accept = request.getHeader(HttpHeaders.ACCEPT);
        return accept != null
                && accept.toLowerCase(Locale.ROOT).contains(MediaType.TEXT_HTML_VALUE);
    }

    private boolean isBackendResource(String path) {
        return path.startsWith("/v3/api-docs")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/error");
    }

    private boolean hasFileExtension(String path) {
        int slash = path.lastIndexOf('/');
        return path.indexOf('.', slash + 1) >= 0;
    }

    private static final class ApiPathRequest extends HttpServletRequestWrapper {

        private final String servletPath;

        private ApiPathRequest(HttpServletRequest request, String servletPath) {
            super(request);
            this.servletPath = servletPath;
        }

        @Override
        public String getRequestURI() {
            return getContextPath() + servletPath;
        }

        @Override
        public String getServletPath() {
            return servletPath;
        }
    }
}
