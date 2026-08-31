package com.codet.lens.vis.core.dash;

import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.ResultEnum;
import com.codet.lens.common.ResultException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 从 configJson.widgets 抽出看板卡片成员。
 * 坐标只存在 widgets 树里，中间表不再承担布局。
 */
public final class VisDashWidgets {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String EMPTY_LAYOUT = "{}";

    private VisDashWidgets() {
    }

    public static String emptyLayoutJson() {
        return EMPTY_LAYOUT;
    }

    public static List<Long> collectCardIds(String configJson) {
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
        return ids;
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
        throw fail("不支持的布局节点: " + (kind.isEmpty() ? "(空)" : kind));
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
}
