package com.codet.lens.vis.core.dash;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.codet.lens.vis.dto.item.FilterItem;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 从看板 config_json.filters 抽出允许下发的全局筛选 / 参数字段。
 * 只按 datasetId + applyAs + field 对齐，多出来的丢掉。
 */
public final class VisDashFilters {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public record Allowed(Set<String> filterFields, Set<String> paramFields) {
        static Allowed empty() {
            return new Allowed(Set.of(), Set.of());
        }
    }

    private VisDashFilters() {
    }

    public static Allowed allowedForDataset(String configJson, Long datasetId) {
        if (datasetId == null || StrUtil.isBlank(configJson)) {
            return Allowed.empty();
        }
        String want = String.valueOf(datasetId);
        JsonNode filters;
        try {
            JsonNode root = MAPPER.readTree(configJson);
            filters = root == null ? null : root.get("filters");
        } catch (Exception ignored) {
            return Allowed.empty();
        }
        if (filters == null || !filters.isArray()) {
            return Allowed.empty();
        }
        Set<String> filterFields = new LinkedHashSet<>();
        Set<String> paramFields = new LinkedHashSet<>();
        for (JsonNode node : filters) {
            if (node == null || !node.isObject()) {
                continue;
            }
            String field = text(node, "field");
            if (field.isEmpty() || !want.equals(text(node, "datasetId"))) {
                continue;
            }
            if ("param".equals(text(node, "applyAs"))) {
                paramFields.add(field);
            } else {
                filterFields.add(field);
            }
        }
        return new Allowed(Set.copyOf(filterFields), Set.copyOf(paramFields));
    }

    public static List<FilterItem> keepFields(List<FilterItem> items, Set<String> fields) {
        if (CollUtil.isEmpty(items) || CollUtil.isEmpty(fields)) {
            return Collections.emptyList();
        }
        List<FilterItem> kept = new ArrayList<>();
        for (FilterItem item : items) {
            if (item == null || StrUtil.isBlank(item.getField())) {
                continue;
            }
            if (fields.contains(item.getField().trim())) {
                kept.add(item);
            }
        }
        return kept;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || value.isMissingNode()) {
            return "";
        }
        return value.asText("").trim();
    }
}
