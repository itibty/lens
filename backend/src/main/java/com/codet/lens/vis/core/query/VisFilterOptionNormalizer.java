package com.codet.lens.vis.core.query;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.codet.lens.vis.dto.dataset.VisFilterOptionItem;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 把数据集结果收成 {@code {label, value}}。
 * <p>
 * 一行一项：优先认 {@code label}/{@code value}（及 name/id 等别名）；单列则两项同值；两列无名时第一列 value、第二列 label。
 * 单格 JSON 数组：字符串、数字或对象均可。
 */
public final class VisFilterOptionNormalizer {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String[] LABEL_KEYS = {"label", "name", "title", "text"};
    private static final String[] VALUE_KEYS = {"value", "id", "code", "key"};

    private VisFilterOptionNormalizer() {
    }

    public static List<VisFilterOptionItem> normalize(List<Map<String, Object>> rows) {
        return normalize(rows, null, null);
    }

    public static List<VisFilterOptionItem> normalize(List<Map<String, Object>> rows, String valueField,
                                                      String labelField) {
        if (CollUtil.isEmpty(rows)) {
            return new ArrayList<>();
        }
        if (StrUtil.isNotBlank(valueField)) {
            return normalizeByFields(rows, valueField.trim(), StrUtil.trim(labelField));
        }
        List<VisFilterOptionItem> fromJson = trySingleCellJson(rows);
        if (fromJson != null) {
            return dedupe(fromJson);
        }
        List<VisFilterOptionItem> items = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (row == null || row.isEmpty()) {
                continue;
            }
            VisFilterOptionItem item = fromRow(row);
            if (item != null) {
                items.add(item);
            }
        }
        return dedupe(items);
    }

    public static List<VisFilterOptionItem> applyKeyword(List<VisFilterOptionItem> items, String keyword) {
        if (CollUtil.isEmpty(items) || StrUtil.isBlank(keyword)) {
            return items == null ? new ArrayList<>() : new ArrayList<>(items);
        }
        String needle = keyword.trim().toLowerCase(Locale.ROOT);
        List<VisFilterOptionItem> matched = new ArrayList<>();
        for (VisFilterOptionItem item : items) {
            if (contains(item.getLabel(), needle) || contains(item.getValue(), needle)) {
                matched.add(item);
            }
        }
        return matched;
    }

    public static List<String> cleanValues(Collection<?> raw) {
        if (raw == null) {
            return new ArrayList<>();
        }
        Map<String, String> seen = new LinkedHashMap<>();
        for (Object item : raw) {
            if (item == null) {
                continue;
            }
            String text = String.valueOf(item).trim();
            if (text.isEmpty() || seen.containsKey(text)) {
                continue;
            }
            seen.put(text, text);
            if (seen.size() >= 50) {
                break;
            }
        }
        return new ArrayList<>(seen.values());
    }

    /** 按请求顺序取出命中项；value 对不上的跳过。 */
    public static List<VisFilterOptionItem> pickByValues(List<VisFilterOptionItem> items, List<String> values) {
        if (CollUtil.isEmpty(values)) {
            return new ArrayList<>();
        }
        Map<String, VisFilterOptionItem> byValue = new LinkedHashMap<>();
        for (VisFilterOptionItem item : items == null ? new ArrayList<VisFilterOptionItem>() : items) {
            if (item == null || StrUtil.isBlank(item.getValue())) {
                continue;
            }
            byValue.putIfAbsent(item.getValue(), item);
        }
        List<VisFilterOptionItem> picked = new ArrayList<>();
        for (String value : values) {
            VisFilterOptionItem hit = byValue.get(value);
            if (hit != null) {
                picked.add(hit);
            }
        }
        return picked;
    }

    public static List<VisFilterOptionItem> limit(List<VisFilterOptionItem> items, int limit) {
        if (items == null) {
            return new ArrayList<>();
        }
        if (limit <= 0 || items.size() <= limit) {
            return new ArrayList<>(items);
        }
        return new ArrayList<>(items.subList(0, limit));
    }

    private static boolean contains(String text, String needle) {
        return text != null && text.toLowerCase(Locale.ROOT).contains(needle);
    }

    private static List<VisFilterOptionItem> trySingleCellJson(List<Map<String, Object>> rows) {
        if (rows.size() != 1) {
            return null;
        }
        Map<String, Object> row = rows.get(0);
        if (row == null || row.size() != 1) {
            return null;
        }
        Object cell = row.values().iterator().next();
        return tryParseJsonArray(cell);
    }

    static List<VisFilterOptionItem> tryParseJsonArray(Object cell) {
        if (cell == null) {
            return null;
        }
        if (cell instanceof Collection) {
            return fromJsonArray((Collection<?>) cell);
        }
        if (cell.getClass().isArray()) {
            int len = java.lang.reflect.Array.getLength(cell);
            List<Object> list = new ArrayList<>(len);
            for (int i = 0; i < len; i++) {
                list.add(java.lang.reflect.Array.get(cell, i));
            }
            return fromJsonArray(list);
        }
        String raw = String.valueOf(cell).trim();
        if (!raw.startsWith("[")) {
            return null;
        }
        try {
            JsonNode node = MAPPER.readTree(raw);
            if (node == null || !node.isArray()) {
                return null;
            }
            return fromJsonNodeArray(node);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static List<VisFilterOptionItem> fromJsonArray(Collection<?> cells) {
        List<VisFilterOptionItem> items = new ArrayList<>();
        for (Object cell : cells) {
            VisFilterOptionItem item = fromJsonValue(cell);
            if (item != null) {
                items.add(item);
            }
        }
        return items;
    }

    private static List<VisFilterOptionItem> fromJsonNodeArray(JsonNode node) {
        List<VisFilterOptionItem> items = new ArrayList<>();
        for (JsonNode child : node) {
            VisFilterOptionItem item = fromJsonNode(child);
            if (item != null) {
                items.add(item);
            }
        }
        return items;
    }

    private static VisFilterOptionItem fromJsonValue(Object cell) {
        if (cell == null) {
            return null;
        }
        if (cell instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = (Map<String, Object>) cell;
            return fromRow(map);
        }
        if (cell instanceof JsonNode) {
            return fromJsonNode((JsonNode) cell);
        }
        String text = stringify(cell);
        if (StrUtil.isBlank(text)) {
            return null;
        }
        return VisFilterOptionItem.of(text, text);
    }

    private static VisFilterOptionItem fromJsonNode(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isObject()) {
            Map<String, Object> map = new LinkedHashMap<>();
            node.fields().forEachRemaining(entry -> map.put(entry.getKey(), jsonNodeValue(entry.getValue())));
            return fromRow(map);
        }
        if (node.isArray()) {
            return null;
        }
        String text = jsonNodeText(node);
        if (StrUtil.isBlank(text)) {
            return null;
        }
        return VisFilterOptionItem.of(text, text);
    }

    private static Object jsonNodeValue(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isNumber() || node.isBoolean() || node.isTextual()) {
            return jsonNodeText(node);
        }
        return node.toString();
    }

    private static String jsonNodeText(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isTextual()) {
            return node.asText();
        }
        if (node.isNumber() || node.isBoolean()) {
            return node.asText();
        }
        return node.toString();
    }

    private static List<VisFilterOptionItem> normalizeByFields(List<Map<String, Object>> rows, String valueField,
                                                               String labelField) {
        String labelKey = StrUtil.blankToDefault(labelField, valueField);
        List<VisFilterOptionItem> items = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            if (row == null || row.isEmpty()) {
                continue;
            }
            Map<String, Object> lower = lowerKeys(row);
            String value = stringify(lookup(row, lower, valueField));
            if (StrUtil.isBlank(value)) {
                continue;
            }
            String label = stringify(lookup(row, lower, labelKey));
            items.add(VisFilterOptionItem.of(StrUtil.blankToDefault(label, value), value));
        }
        return dedupe(items);
    }

    private static Map<String, Object> lowerKeys(Map<String, Object> row) {
        Map<String, Object> lower = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : row.entrySet()) {
            if (entry.getKey() == null) {
                continue;
            }
            lower.put(entry.getKey().toLowerCase(Locale.ROOT), entry.getValue());
        }
        return lower;
    }

    private static Object lookup(Map<String, Object> row, Map<String, Object> lower, String field) {
        if (row.containsKey(field)) {
            return row.get(field);
        }
        return lower.get(field.toLowerCase(Locale.ROOT));
    }

    static VisFilterOptionItem fromRow(Map<String, Object> row) {
        Map<String, Object> lower = lowerKeys(row);
        String label = firstNamed(lower, LABEL_KEYS);
        String value = firstNamed(lower, VALUE_KEYS);
        if (StrUtil.isBlank(label) && StrUtil.isBlank(value)) {
            List<Object> cells = new ArrayList<>();
            for (Object cell : row.values()) {
                if (cell != null && StrUtil.isNotBlank(stringify(cell))) {
                    cells.add(cell);
                }
            }
            if (cells.isEmpty()) {
                return null;
            }
            if (cells.size() == 1) {
                String text = stringify(cells.get(0));
                return VisFilterOptionItem.of(text, text);
            }
            value = stringify(cells.get(0));
            label = stringify(cells.get(1));
        }
        if (StrUtil.isBlank(value) && StrUtil.isNotBlank(label)) {
            value = label;
        }
        if (StrUtil.isBlank(label) && StrUtil.isNotBlank(value)) {
            label = value;
        }
        if (StrUtil.isBlank(value)) {
            return null;
        }
        return VisFilterOptionItem.of(label, value);
    }

    private static String firstNamed(Map<String, Object> lower, String[] keys) {
        for (String key : keys) {
            if (lower.containsKey(key)) {
                String text = stringify(lower.get(key));
                if (StrUtil.isNotBlank(text)) {
                    return text;
                }
            }
        }
        return null;
    }

    private static List<VisFilterOptionItem> dedupe(List<VisFilterOptionItem> items) {
        Map<String, VisFilterOptionItem> byValue = new LinkedHashMap<>();
        for (VisFilterOptionItem item : items) {
            if (item == null || StrUtil.isBlank(item.getValue())) {
                continue;
            }
            byValue.putIfAbsent(item.getValue(), item);
        }
        return new ArrayList<>(byValue.values());
    }

    private static String stringify(Object raw) {
        if (raw == null) {
            return null;
        }
        return String.valueOf(raw).trim();
    }
}
