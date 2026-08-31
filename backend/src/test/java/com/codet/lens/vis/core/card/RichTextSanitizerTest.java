package com.codet.lens.vis.core.card;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RichTextSanitizerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

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
