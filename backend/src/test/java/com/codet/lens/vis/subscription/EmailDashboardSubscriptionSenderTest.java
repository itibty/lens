package com.codet.lens.vis.subscription;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class EmailDashboardSubscriptionSenderTest {

    @Test
    void rendersWideCompactEmailWithoutRoundedScreenshot() {
        DashboardSubscriptionMessage message = new DashboardSubscriptionMessage(
                "经营订阅 <每日>",
                "经营总览",
                "receiver@example.com",
                "https://lens.example.com/vis/dashboards/view?id=1&source=mail",
                0,
                new byte[] {1});

        String html = EmailDashboardSubscriptionSender.renderHtml(message);

        assertTrue(html.contains("max-width:1600px"));
        assertTrue(html.contains("padding:12px 8px"));
        assertTrue(html.contains("width=\"100%\" style=\"display:block;width:100%;max-width:100%;height:auto;border:0\""));
        assertFalse(html.contains("alt=\"经营总览\" style=\"display:block;max-width:100%;height:auto;border:1px"));
        assertTrue(html.contains("经营订阅 &lt;每日&gt;"));
        assertTrue(html.contains("id=1&amp;source=mail"));
    }
}
