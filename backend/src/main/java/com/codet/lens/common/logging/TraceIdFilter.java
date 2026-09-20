package com.codet.lens.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TraceIdFilter extends OncePerRequestFilter {
    private static final String ATTRIBUTE = TraceIdFilter.class.getName() + ".traceId";
    private static final Pattern VALID_ID = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,63}");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String traceId = (String) request.getAttribute(ATTRIBUTE);
        if (traceId == null) {
            String supplied = request.getHeader(TraceContext.HEADER);
            traceId = supplied != null && VALID_ID.matcher(supplied).matches()
                    ? supplied : TraceContext.newId();
            request.setAttribute(ATTRIBUTE, traceId);
        }
        response.setHeader(TraceContext.HEADER, traceId);
        try (TraceContext ignored = TraceContext.open(traceId)) {
            chain.doFilter(request, response);
        }
    }

    @Override
    protected boolean shouldNotFilterAsyncDispatch() {
        return false;
    }

    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return false;
    }
}
