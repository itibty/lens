package com.codet.lens.common.logging;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.ServletException;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;

class TraceIdFilterTest {
    private final TraceIdFilter filter = new TraceIdFilter();

    @AfterEach
    void clear() {
        MDC.clear();
    }

    @Test
    void generatesIdBeforeRejectedRequestAndRestoresContext() throws Exception {
        MDC.put("outer", "preserved");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/vis/datasets");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> {
            assertEquals(response.getHeader(TraceContext.HEADER), MDC.get(TraceContext.KEY));
            assertTrue(MDC.get(TraceContext.KEY).matches("[a-f0-9]{32}"));
            ((MockHttpServletResponse) res).setStatus(403);
        });
        assertEquals(403, response.getStatus());
        assertEquals(Map.of("outer", "preserved"), MDC.getCopyOfContextMap());
    }

    @Test
    void preservesValidUpstreamIdAcrossAsyncAndErrorDispatch() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(TraceContext.HEADER, "upstream-123_abc.1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) ->
                assertEquals("upstream-123_abc.1", MDC.get(TraceContext.KEY)));
        request.setDispatcherType(DispatcherType.ASYNC);
        filter.doFilter(request, response, (req, res) ->
                assertEquals("upstream-123_abc.1", MDC.get(TraceContext.KEY)));
        request.setDispatcherType(DispatcherType.ERROR);
        request.setAttribute("jakarta.servlet.error.request_uri", "/api/test");
        filter.doFilter(request, response, (req, res) ->
                assertEquals("upstream-123_abc.1", MDC.get(TraceContext.KEY)));
        assertEquals("upstream-123_abc.1", response.getHeader(TraceContext.HEADER));
        assertNull(MDC.get(TraceContext.KEY));
    }

    @Test
    void replacesInvalidHeadersAndCleansUpOnExceptions() {
        for (String value : new String[]{"", " ", "a\nforged", "a".repeat(65)}) {
            MockHttpServletRequest request = new MockHttpServletRequest();
            request.addHeader(TraceContext.HEADER, value);
            MockHttpServletResponse response = new MockHttpServletResponse();
            assertThrows(ServletException.class, () -> filter.doFilter(request, response, (req, res) -> {
                assertTrue(MDC.get(TraceContext.KEY).matches("[a-f0-9]{32}"));
                throw new ServletException("failed");
            }));
            assertNotEquals(value, response.getHeader(TraceContext.HEADER));
            assertNull(MDC.get(TraceContext.KEY));
        }
    }
}
