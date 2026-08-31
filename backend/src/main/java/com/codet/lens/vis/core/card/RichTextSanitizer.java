package com.codet.lens.vis.core.card;

import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.ResultException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.owasp.html.PolicyFactory;
import org.owasp.html.Sanitizers;

/**
 * 清洗富文本卡片中的 HTML。数据库只保存白名单内容，前端仍需在渲染边界二次清洗。
 */
public final class RichTextSanitizer {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final PolicyFactory POLICY = Sanitizers.FORMATTING
            .and(Sanitizers.BLOCKS)
            .and(Sanitizers.TABLES)
            .and(Sanitizers.LINKS)
            .and(Sanitizers.STYLES);

    private RichTextSanitizer() {
    }

    public static String sanitizeVisualJson(String visualJson) {
        if (StrUtil.isBlank(visualJson)) {
            return visualJson;
        }
        try {
            JsonNode root = MAPPER.readTree(visualJson);
            if (root == null || !root.isObject()) {
                throw ResultException.fail("富文本可视化配置必须是 JSON 对象");
            }
            JsonNode richtext = root.get("richtext");
            if (richtext != null && richtext.isObject()) {
                sanitizeHtmlField(richtext);
                JsonNode modules = richtext.get("modules");
                if (modules != null && modules.isArray()) {
                    for (JsonNode module : modules) {
                        sanitizeHtmlField(module);
                    }
                }
            }
            return MAPPER.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            throw ResultException.fail("富文本可视化配置不是合法 JSON");
        }
    }

    private static void sanitizeHtmlField(JsonNode node) {
        if (!(node instanceof ObjectNode object)) {
            return;
        }
        JsonNode html = object.get("html");
        if (html != null && html.isTextual()) {
            object.put("html", POLICY.sanitize(html.asText()));
        }
    }
}
