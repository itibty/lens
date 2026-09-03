package com.codet.lens.vis.core.dash;

import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.base.ResultEnum;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.core.card.RichTextSanitizer;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 从 configJson.widgets 抽出看板卡片成员。
 * 坐标只存在 widgets 树里，中间表不再承担布局。
 */
public final class VisDashWidgets {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String EMPTY_LAYOUT = "{}";
    private static final int TEXT_ID_MAX_LENGTH = 100;
    private static final int TEXT_HTML_MAX_LENGTH = 20_000;
    private static final Set<String> TEXT_SURFACES = Set.of("plain", "card");
    private static final Set<String> TEXT_PADDINGS = Set.of("sm", "md", "lg");
    private static final Set<String> TEXT_VERTICAL_ALIGNS = Set.of("start", "center", "end");
    private static final Pattern TEXT_COLOR = Pattern.compile(
            "^(?:#[0-9a-fA-F]{3,8}|rgba?\\([0-9\\s.,%]+\\))$");

    private VisDashWidgets() {
    }

    public static String emptyLayoutJson() {
        return EMPTY_LAYOUT;
    }

    public static List<Long> collectCardIds(String configJson) {
        return prepare(configJson).cardIds();
    }

    /** 校验布局、清洗原生富文本，并一次性返回真实卡片成员。 */
    public static PreparedConfig prepare(String configJson) {
        if (StrUtil.isBlank(configJson)) {
            throw fail("看板配置不能为空");
        }
        JsonNode root;
        try {
            root = MAPPER.readTree(configJson);
        } catch (JsonProcessingException e) {
            throw fail("看板配置不是合法 JSON");
        }
        if (root == null || root.isNull()) {
            throw fail("看板配置必须是对象");
        }
        if (!root.isObject()) {
            throw fail("看板配置必须是对象");
        }
        JsonNode widgets = root.get("widgets");
        if (widgets == null || widgets.isNull()) {
            throw fail("看板配置必须包含 widgets 数组");
        }
        if (!widgets.isArray()) {
            throw fail("widgets 必须是数组");
        }
        List<Long> ids = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        for (JsonNode widget : widgets) {
            walkWidget(widget, ids, seen);
        }
        try {
            return new PreparedConfig(MAPPER.writeValueAsString(root), List.copyOf(ids));
        } catch (JsonProcessingException e) {
            throw fail("看板配置序列化失败");
        }
    }

    private static void walkWidget(JsonNode widget, List<Long> ids, Set<Long> seen) {
        if (widget == null || !widget.isObject()) {
            throw fail("widgets 项必须是对象");
        }
        String kind = text(widget, "kind");
        if ("card".equals(kind)) {
            addCardId(widget.get("cardId"), ids, seen);
            return;
        }
        if ("group".equals(kind)) {
            JsonNode pages = widget.get("pages");
            if (pages == null || pages.isNull()) {
                return;
            }
            if (!pages.isArray()) {
                throw fail("分组 pages 必须是数组");
            }
            for (JsonNode page : pages) {
                walkPage(page, ids, seen);
            }
            return;
        }
        if ("text".equals(kind)) {
            sanitizeTextWidget(widget);
            return;
        }
        throw fail("不支持的布局节点: " + (kind.isEmpty() ? "(空)" : kind));
    }

    private static void sanitizeTextWidget(JsonNode widget) {
        if (!(widget instanceof ObjectNode object)) {
            throw fail("文本节点必须是对象");
        }
        String id = text(widget, "id");
        if (id.isEmpty() || id.length() > TEXT_ID_MAX_LENGTH) {
            throw fail("文本节点 id 无效");
        }
        JsonNode html = widget.get("html");
        if (html == null || !html.isTextual()) {
            throw fail("文本节点 html 必须是字符串");
        }
        if (html.asText().length() > TEXT_HTML_MAX_LENGTH) {
            throw fail("文本内容不能超过 " + TEXT_HTML_MAX_LENGTH + " 个字符");
        }
        String cleanHtml = RichTextSanitizer.sanitizeHtml(html.asText());
        if (cleanHtml.length() > TEXT_HTML_MAX_LENGTH) {
            throw fail("文本内容不能超过 " + TEXT_HTML_MAX_LENGTH + " 个字符");
        }
        object.put("html", cleanHtml);
        validateTextAppearance(widget.get("appearance"));
    }

    private static void validateTextAppearance(JsonNode appearance) {
        if (appearance == null || appearance.isNull()) {
            return;
        }
        if (!appearance.isObject()) {
            throw fail("文本外观 appearance 必须是对象");
        }
        validateEnum(appearance, "surface", TEXT_SURFACES);
        validateEnum(appearance, "padding", TEXT_PADDINGS);
        validateEnum(appearance, "verticalAlign", TEXT_VERTICAL_ALIGNS);
        validateColor(appearance, "bg");
        validateColor(appearance, "color");
    }

    private static void validateEnum(JsonNode node, String field, Set<String> values) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return;
        }
        if (!value.isTextual() || !values.contains(value.asText())) {
            throw fail("文本外观 " + field + " 无效");
        }
    }

    private static void validateColor(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return;
        }
        if (!value.isTextual() || !TEXT_COLOR.matcher(value.asText().trim()).matches()) {
            throw fail("文本外观 " + field + " 无效");
        }
    }

    private static void walkPage(JsonNode page, List<Long> ids, Set<Long> seen) {
        if (page == null || !page.isObject()) {
            throw fail("分组页必须是对象");
        }
        JsonNode items = page.get("items");
        if (items == null || items.isNull()) {
            return;
        }
        if (!items.isArray()) {
            throw fail("分组页 items 必须是数组");
        }
        for (JsonNode item : items) {
            if (item == null || !item.isObject()) {
                throw fail("分组页卡片必须是对象");
            }
            if ("group".equals(text(item, "kind"))) {
                throw fail("分组不能再套分组");
            }
            addCardId(item.get("cardId"), ids, seen);
        }
    }

    private static void addCardId(JsonNode node, List<Long> ids, Set<Long> seen) {
        Long cardId = readLong(node);
        if (cardId == null) {
            throw fail("cardId 无效");
        }
        if (!seen.add(cardId)) {
            throw fail("看板内卡片重复: " + cardId);
        }
        ids.add(cardId);
    }

    private static Long readLong(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        if (node.isNumber()) {
            return node.longValue();
        }
        if (node.isTextual()) {
            String raw = node.asText("").trim();
            if (raw.isEmpty()) {
                return null;
            }
            try {
                return Long.parseLong(raw);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return "";
        }
        return value.asText("").trim();
    }

    private static ResultException fail(String msg) {
        return new ResultException(ResultEnum.FAIL.getCode(), msg);
    }

    public record PreparedConfig(String configJson, List<Long> cardIds) {
    }
}
