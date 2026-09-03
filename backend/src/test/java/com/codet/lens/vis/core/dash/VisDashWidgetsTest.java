package com.codet.lens.vis.core.dash;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VisDashWidgetsTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void acceptsNativeTextWithoutCreatingCardMembership() throws Exception {
        String config = """
                {"widgets":[
                  {"kind":"text","id":"note-1","html":"<h3>口径</h3><p>按支付时间统计</p>",
                   "appearance":{"surface":"card","padding":"md","verticalAlign":"start"}},
                  {"kind":"card","cardId":"101"}
                ]}
                """;

        VisDashWidgets.PreparedConfig prepared = VisDashWidgets.prepare(config);
        JsonNode text = MAPPER.readTree(prepared.configJson()).path("widgets").get(0);

        assertEquals(List.of(101L), prepared.cardIds());
        assertEquals("text", text.path("kind").asText());
        assertEquals("note-1", text.path("id").asText());
    }

    @Test
    void sanitizesNativeTextHtmlBeforePersistence() throws Exception {
        String config = """
                {"widgets":[{"kind":"text","id":"note-1",
                  "html":"<p onclick=\\"steal()\\">安全<script>alert(1)</script></p>"}]}
                """;

        JsonNode text = MAPPER.readTree(VisDashWidgets.prepare(config).configJson())
                .path("widgets").get(0);
        String html = text.path("html").asText();

        assertTrue(html.contains("安全"));
        assertFalse(html.contains("onclick"));
        assertFalse(html.contains("script"));
    }

    @Test
    void stillRejectsUnknownWidgetKinds() {
        var error = assertThrows(RuntimeException.class,
                () -> VisDashWidgets.prepare("{\"widgets\":[{\"kind\":\"future\"}]}"));

        assertTrue(error.getMessage().contains("不支持的布局节点"));
    }

    @Test
    void rejectsInvalidTextAppearance() {
        var error = assertThrows(RuntimeException.class,
                () -> VisDashWidgets.prepare("""
                        {"widgets":[{"kind":"text","id":"note-1","html":"<p>说明</p>",
                         "appearance":{"surface":"image"}}]}
                        """));

        assertEquals("文本外观 surface 无效", error.getMessage());
    }
}
