package com.codet.lens.vis.subscription;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.config.LensProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Download;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.options.WaitUntilState;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardScreenshotService {
    private static final ObjectMapper JSON = new ObjectMapper();

    private final LensProperties properties;

    public byte[] capture(Long dashboardId, String authorization) {
        requireEnabled();
        long timeout = properties.getSubscription().getScreenshotTimeoutMs();
        String baseUrl = trimSlash(properties.getSubscription().getPublicBaseUrl());
        String url = baseUrl + "/vis/dashboards/view?id="
                + URLEncoder.encode(dashboardId.toString(), StandardCharsets.UTF_8)
                + "&subscriptionScreenshot=1";
        String executablePath = properties.getSubscription().getBrowserExecutablePath();
        String channel = properties.getSubscription().getBrowserChannel();
        boolean useInstalledBrowser = (executablePath != null && !executablePath.isBlank())
                || (channel != null && !channel.isBlank());
        Playwright.CreateOptions createOptions = new Playwright.CreateOptions();
        if (useInstalledBrowser) {
            createOptions.setEnv(Map.of("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD", "1"));
        }
        try (Playwright playwright = Playwright.create(createOptions)) {
            BrowserType.LaunchOptions launchOptions = new BrowserType.LaunchOptions().setHeadless(true);
            if (executablePath != null && !executablePath.isBlank()) {
                launchOptions.setExecutablePath(Path.of(executablePath.trim()));
            } else if (channel != null && !channel.isBlank()) {
                launchOptions.setChannel(channel.trim());
            }
            Browser browser = playwright.chromium().launch(launchOptions);
            try (browser; BrowserContext context = browser.newContext(
                    new Browser.NewContextOptions()
                            .setAcceptDownloads(true)
                            .setViewportSize(1440, 900))) {
                context.addInitScript("window.localStorage.setItem('NA:access_token', "
                        + JSON.writeValueAsString(authorization) + ");");
                Page page = context.newPage();
                page.setDefaultTimeout(timeout);
                page.navigate(url, new Page.NavigateOptions()
                        .setTimeout(timeout)
                        .setWaitUntil(WaitUntilState.DOMCONTENTLOADED));
                page.locator("[data-dashboard-tools-trigger]").click();
                Download download = page.waitForDownload(() -> {
                    page.locator("[data-dashboard-screenshot-action]").click();
                    page.waitForFunction("""
                            () => ['success', 'failed'].includes(document.querySelector(
                              '[data-dashboard-screenshot-status]')?.dataset.dashboardScreenshotStatus)
                            """);
                    String status = page.locator("[data-dashboard-screenshot-status]")
                            .getAttribute("data-dashboard-screenshot-status");
                    if ("failed".equals(status)) {
                        throw ResultException.fail("看板截图失败: " + page.locator("[data-dashboard-screenshot-status]")
                                .getAttribute("data-dashboard-screenshot-error"));
                    }
                });
                Path path = download.path();
                byte[] bytes = Files.readAllBytes(path);
                if (bytes.length == 0) {
                    throw ResultException.fail("看板截图为空");
                }
                if (bytes.length > properties.getSubscription().getMaxScreenshotBytes()) {
                    throw ResultException.fail("看板截图超过大小限制");
                }
                return bytes;
            }
        } catch (ResultException e) {
            throw e;
        } catch (Exception e) {
            throw ResultException.fail("看板截图失败: " + safeMessage(e));
        }
    }

    public void requireEnabled() {
        if (!properties.getSubscription().isEnabled()) {
            throw ResultException.fail("看板订阅功能尚未启用");
        }
        if (properties.getSubscription().getPublicBaseUrl() == null
                || properties.getSubscription().getPublicBaseUrl().isBlank()) {
            throw ResultException.fail("看板订阅访问地址尚未配置");
        }
    }

    private static String trimSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static String safeMessage(Exception e) {
        String message = e.getMessage();
        return message == null || message.isBlank() ? e.getClass().getSimpleName() : message;
    }
}
