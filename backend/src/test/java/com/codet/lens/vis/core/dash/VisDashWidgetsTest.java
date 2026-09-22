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
    void preservesLegacyAnnotationContentOnSave() throws Exception {
        String block = "<div data-lens-note=\"chapter\"><p data-lens-note-part=\"number\">09</p>"
                + "<div data-lens-note-part=\"body\"><h3>已编辑标题</h3><p>已编辑说明</p></div></div>";
        var root = MAPPER.createObjectNode();
        root.putArray("widgets").addObject().put("kind", "text").put("id", "note-1")
                .put("html", "<p>普通文本</p>" + block + block);
        var prepared = VisDashWidgets.prepare(MAPPER.writeValueAsString(root));
        String html = MAPPER.readTree(prepared.configJson()).path("widgets").get(0).path("html").asText();

        String cleanBlock = "<div><p>09</p><div><h3>已编辑标题</h3><p>已编辑说明</p></div></div>";
        assertEquals("<p>普通文本</p>" + cleanBlock + cleanBlock, html);
        assertTrue(prepared.cardIds().isEmpty());
    }

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

    @Test
    void preservesIndependentTextPadding() throws Exception {
        String config = """
                {"widgets":[{"kind":"text","id":"note","html":"<p>说明</p>",
                 "appearance":{"padding":"md","insets":{"top":8,"right":12,"bottom":16,"left":20}}}]}
                """;
        JsonNode insets = MAPPER.readTree(VisDashWidgets.prepare(config).configJson())
                .path("widgets").get(0).path("appearance").path("insets");
        assertEquals(MAPPER.readTree("{\"top\":8,\"right\":12,\"bottom\":16,\"left\":20}"), insets);
    }

    @Test
    void rejectsInvalidTextPadding() {
        for (String value : List.of("-1", "81", "1.5", "\"12\"", "9999999999999")) {
            String config = "{\"widgets\":[{\"kind\":\"text\",\"id\":\"note\",\"html\":\"\","
                    + "\"appearance\":{\"insets\":{\"left\":" + value + "}}}]}";
            assertThrows(RuntimeException.class, () -> VisDashWidgets.prepare(config));
        }
    }

    @Test
    void acceptsLocalTextAndHiddenRemarkWithoutChangingMembership() throws Exception {
        String config = """
                {"widgets":[{"kind":"card","cardId":"101"}],
                 "cardDisplayOverrides":{"101":{"title":" 区域营收 ","description":null}}}
                """;
        var prepared = VisDashWidgets.prepare(config);
        var display = MAPPER.readTree(prepared.configJson()).path("cardDisplayOverrides").path("101");
        assertEquals(List.of(101L), prepared.cardIds());
        assertEquals("区域营收", display.path("title").asText());
        assertTrue(display.path("description").isNull());
    }

    @Test
    void rejectsForeignMembersAndInvalidDisplayText() {
        for (String overrides : List.of(
                "null", "[]", "{\"102\":{\"title\":\"外部卡片\"}}",
                "{\"101\":null}", "{\"101\":{\"title\":42}}",
                "{\"101\":{\"title\":\"  \"}}",
                "{\"101\":{\"title\":\"" + "长".repeat(51) + "\"}}",
                "{\"101\":{\"description\":\"" + "长".repeat(201) + "\"}}")) {
            String config = "{\"widgets\":[{\"kind\":\"card\",\"cardId\":\"101\"}],\"cardDisplayOverrides\":" + overrides + "}";
            assertThrows(RuntimeException.class, () -> VisDashWidgets.prepare(config), overrides);
        }
    }
}
