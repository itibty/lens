package com.codet.lens.common;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AppRoutingFilterTest {

    private final AppRoutingFilter filter = new AppRoutingFilter();

    @Test
    void stripsApiPrefixBeforeControllerDispatch() throws Exception {
        MockHttpServletRequest request = request("POST", "/api/auth/login");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<HttpServletRequest> dispatched = new AtomicReference<>();

        filter.doFilter(request, response, (req, res) -> dispatched.set((HttpServletRequest) req));

        assertEquals("/auth/login", dispatched.get().getServletPath());
        assertEquals("/auth/login", dispatched.get().getRequestURI());
    }

    @Test
    void forwardsHtmlNavigationToSpaEntry() throws Exception {
        MockHttpServletRequest request = request("GET", "/vis/cards/edit");
        request.addHeader(HttpHeaders.ACCEPT, MediaType.TEXT_HTML_VALUE);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean continued = new AtomicBoolean();

        filter.doFilter(request, response, (req, res) -> continued.set(true));

        assertEquals("/index.html", response.getForwardedUrl());
        assertFalse(continued.get());
    }

    @Test
    void leavesStaticResourcesOnTheNormalChain() throws Exception {
        MockHttpServletRequest request = request("GET", "/js/index-abcd.js");
        request.addHeader(HttpHeaders.ACCEPT, MediaType.TEXT_HTML_VALUE);
        AtomicBoolean continued = new AtomicBoolean();

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> continued.set(true));

        assertTrue(continued.get());
    }

    @Test
    void leavesJsonRequestsAndBackendDocsOnTheNormalChain() throws Exception {
        MockHttpServletRequest jsonRequest = request("GET", "/vis/cards/1");
        jsonRequest.addHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE);
        MockHttpServletRequest docsRequest = request("GET", "/v3/api-docs/vis");
        docsRequest.addHeader(HttpHeaders.ACCEPT, MediaType.TEXT_HTML_VALUE);
        AtomicBoolean jsonContinued = new AtomicBoolean();
        AtomicBoolean docsContinued = new AtomicBoolean();

        filter.doFilter(
                jsonRequest,
                new MockHttpServletResponse(),
                (req, res) -> jsonContinued.set(true));
        filter.doFilter(
                docsRequest,
                new MockHttpServletResponse(),
                (req, res) -> docsContinued.set(true));

        assertTrue(jsonContinued.get());
        assertTrue(docsContinued.get());
    }

    private MockHttpServletRequest request(String method, String path) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.setServletPath(path);
        return request;
    }
}
