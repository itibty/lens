package com.codet.lens.vis.core.card;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RichTextSanitizerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void removesRetiredPresetAttributesAndPreservesRichTextContent() {
        String html = """
                <div data-lens-note="chapter"><p data-lens-note-part="number">02</p>
                  <div data-lens-note-part="body"><h3>章节</h3><p>内容</p></div></div>
                <blockquote data-lens-template="sideline"><p>说明</p></blockquote>
                <p data-lens-template="number">第三章</p><hr data-lens-template="divider">
                <span onclick="steal()">正文</span><script>alert(1)</script>
                """;
        String sanitized = RichTextSanitizer.sanitizeHtml(html);

        assertTrue(sanitized.contains("<p>02</p>"));
        assertTrue(sanitized.contains("<h3>章节</h3><p>内容</p>"));
        assertTrue(sanitized.contains("<blockquote><p>说明</p></blockquote>"));
        assertTrue(sanitized.contains("<p>第三章</p>"));
        assertTrue(sanitized.contains("<hr"));
        assertFalse(sanitized.contains("data-lens-"));
        assertFalse(sanitized.contains("onclick"));
        assertFalse(sanitized.contains("script"));
    }

    @Test
    void sanitizesLegacyAndModuleHtml() throws Exception {
        String visual = """
                {
                  "chartType":"richtext",
                  "richtext":{
                    "html":"<p onclick=\\"steal()\\">安全<script>alert(1)</script></p>",
                    "modules":[
                      {"type":"richtext","html":"<a href=\\"javascript:steal()\\">链接</a>"},
                      {"type":"callout","text":"提示"}
                    ]
                  }
                }
                """;

        JsonNode sanitized = MAPPER.readTree(RichTextSanitizer.sanitizeVisualJson(visual));
        String legacy = sanitized.path("richtext").path("html").asText();
        String module = sanitized.path("richtext").path("modules").get(0).path("html").asText();

        assertTrue(legacy.contains("<p>安全</p>"));
        assertFalse(legacy.contains("onclick"));
        assertFalse(legacy.contains("script"));
        assertFalse(module.contains("javascript:"));
        assertTrue(module.contains("链接"));
    }

    @Test
    void preservesSafeFormattingAndStyles() throws Exception {
        String visual = """
                {"richtext":{"modules":[{"type":"richtext",
                  "html":"<h3>标题</h3><p><strong style=\\"color:red\\">正文</strong></p><ul><li>一</li></ul>"
                }]}}
                """;

        JsonNode sanitized = MAPPER.readTree(RichTextSanitizer.sanitizeVisualJson(visual));
        String html = sanitized.path("richtext").path("modules").get(0).path("html").asText();

        assertTrue(html.contains("<h3>标题</h3>"));
        assertTrue(html.contains("<strong"));
        assertTrue(html.contains("color"));
        assertTrue(html.contains("<ul><li>一</li></ul>"));
    }
}
