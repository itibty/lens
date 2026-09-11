package com.codet.lens.vis.subscription;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.config.LensProperties;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import static org.junit.jupiter.api.Assertions.*;

/** 验证真实浏览器下载和失败握手，不连接业务页面或 SMTP。 */
@EnabledIfEnvironmentVariable(named = "LENS_TEST_BROWSER", matches = ".+")
class DashboardScreenshotServiceBrowserTest {
    private HttpServer server;
    private static final String PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";

    @AfterEach
    void closeServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void downloadsImageAfterFrontendSignalsSuccess() throws Exception {
        DashboardScreenshotService service = fixture(false);
        assertArrayEquals(Base64.getDecoder().decode(PNG), service.capture(9L, "Bearer test"));
    }

    @Test
    void propagatesFrontendFailureWithoutWaitingForDownloadTimeout() throws Exception {
        DashboardScreenshotService service = fixture(true);
        ResultException error = assertThrows(ResultException.class, () -> service.capture(9L, "Bearer test"));
        assertTrue(error.getMessage().contains("卡片查询失败"));
        assertFalse(error.getMessage().contains("Timeout"));
    }

    private DashboardScreenshotService fixture(boolean fail) throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        String action = fail
                ? "root.dataset.dashboardScreenshotStatus='failed'; root.dataset.dashboardScreenshotError='卡片查询失败';"
                : "const a=document.createElement('a'); a.href='data:image/png;base64," + PNG
                  + "'; a.download='dashboard.png'; a.click(); root.dataset.dashboardScreenshotStatus='success';";
        byte[] html = ("""
                <!doctype html><html><body>
                <div id="root" data-dashboard-screenshot-status="idle"></div>
                <button data-dashboard-tools-trigger>Tools</button>
                <button data-dashboard-screenshot-action onclick="capture()">Screenshot</button>
                <script>
                function capture() {
                  const root=document.getElementById('root');
                  root.dataset.dashboardScreenshotStatus='running';
                  setTimeout(() => { %s }, 100);
                }
                </script></body></html>
                """).formatted(action).getBytes(StandardCharsets.UTF_8);
        server.createContext("/", exchange -> {
            exchange.getResponseHeaders().set("Content-Type", "text/html;charset=utf-8");
            exchange.sendResponseHeaders(200, html.length);
            try (var body = exchange.getResponseBody()) {
                body.write(html);
            }
        });
        server.start();
        var properties = new LensProperties();
        properties.getSubscription().setEnabled(true);
        properties.getSubscription().setBrowserChannel(System.getenv("LENS_TEST_BROWSER"));
        properties.getSubscription().setPublicBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        properties.getSubscription().setScreenshotTimeoutMs(5_000);
        return new DashboardScreenshotService(properties);
    }
}
