package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.dto.item.FilterItem;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDatasetFieldMapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.vis.entity.VisDatasetField;
import com.codet.lens.vis.enums.DateValueExpEnum;
import com.codet.lens.vis.core.query.DateValueExpResolver;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 按当前报表定义恢复查看状态，失效项逐项使用公共缺省。 */
@Service
@RequiredArgsConstructor
public class DashboardViewStateService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final VisDatasetMapper datasets;
    private final VisDatasetFieldMapper fields;
    private final VisCardMapper cards;
    public record Snapshot(String stateJson, String bindingsJson, String summary) {}

    public Snapshot snapshot(VisDashboard dashboard, String stateJson, String bindingsJson) {
        ObjectNode state = stateJson == null ? JSON.createObjectNode().put("schemaVersion", 2) : object(stateJson);
        int version = state.path("schemaVersion").asInt();
        if (!state.path("schemaVersion").isIntegralNumber() || (version != 1 && version != 2))
            throw ResultException.fail("暂不支持此版本的个人视图");
        state.fieldNames().forEachRemaining(key -> {
            if (!(version == 1 ? Set.of("schemaVersion", "filters") : Set.of("schemaVersion", "filters", "tabs")).contains(key))
                throw ResultException.fail("视图包含暂不支持的状态");
        });
        JsonNode requested = state.path("filters");
        if (!requested.isMissingNode() && !requested.isObject()) throw ResultException.fail("筛选状态必须是对象");
        JsonNode requestedTabs = state.path("tabs");
        if (!requestedTabs.isMissingNode() && !requestedTabs.isObject()) throw ResultException.fail("Tab 状态必须是对象");
        ObjectNode bindings = JSON.createObjectNode();
        ObjectNode values = JSON.createObjectNode();
        ObjectNode savedBindings = bindingsJson == null ? null : object(bindingsJson);
        List<String> summary = new ArrayList<>();
        for (var entry : definitions(dashboard).entrySet()) {
            String uid = entry.getKey();
            JsonNode def = entry.getValue();
            ObjectNode signature = signature(def);
            // 不可用的筛选不能继续生成查询条件；签名保留失效标记，恢复可用时再取默认值。
            if (signature == null) {
                bindings.putObject(uid).put("unavailable", true);
                values.set(uid, emptyValue());
                continue;
            }
            bindings.set(uid, signature);
            boolean compatible = savedBindings == null || !savedBindings.has(uid) || signature.equals(savedBindings.get(uid));
            JsonNode value = compatible && requested.has(uid) ? requested.get(uid) : def.path("defaultValue");
            ObjectNode normalized = normalizeOrDefault(def, value);
            values.set(uid, normalized);
            if (normalized.hasNonNull("valueExp")) summary.add(label(def) + "：" + expressionLabel(normalized));
            else if (!normalized.path("value").isEmpty()) {
                List<String> items = new ArrayList<>();
                normalized.path("value").forEach(item -> items.add(item.asText()));
                summary.add(label(def) + "：" + String.join("、", items));
            }
        }
        ObjectNode result = JSON.createObjectNode().put("schemaVersion", 2);
        result.set("filters", values);
        result.set("tabs", resolveTabs(dashboard, requestedTabs, summary));
        return new Snapshot(result.toString(), bindings.toString(), summary.isEmpty() ? "报表默认" : String.join("；", summary));
    }

    private static ObjectNode emptyValue() {
        ObjectNode value = JSON.createObjectNode();
        value.putArray("value");
        return value;
    }

    private static ObjectNode normalizeOrDefault(JsonNode def, JsonNode raw) {
        try { return normalize(def, raw.isNull() ? def.path("defaultValue") : raw); }
        catch (ResultException invalidValue) {
            try { return normalize(def, def.path("defaultValue")); }
            catch (ResultException invalidDefault) { return emptyValue(); }
        }
    }

    private ObjectNode resolveTabs(VisDashboard dashboard, JsonNode requested, List<String> summary) {
        ObjectNode tabs = JSON.createObjectNode();
        for (JsonNode widget : configuration(dashboard).path("widgets")) {
            if (!"group".equals(widget.path("kind").asText()) || !"tabs".equals(widget.path("mode").asText())) continue;
            String groupId = widget.path("id").asText();
            if (groupId.isBlank()) continue;
            Map<String, JsonNode> members = new LinkedHashMap<>();
            for (JsonNode page : widget.path("pages")) {
                String id = page.path("items").path(0).path("cardId").asText();
                if (!id.matches("[1-9][0-9]{0,18}")) continue;
                try { members.put(String.valueOf(Long.parseLong(id)), page); }
                catch (NumberFormatException ignored) { /* 非法成员不参与恢复。 */ }
            }
            // 只读选中卡片；失效后依次尝试默认项，避免每次订阅查询都读取所有未展示 Tab。
            var candidates = new java.util.LinkedHashSet<String>();
            String selected = requested.path(groupId).path("activeCardId").asText();
            if (members.containsKey(selected)) candidates.add(selected);
            candidates.addAll(members.keySet());
            for (String candidate : candidates) {
                var card = cards.selectById(Long.parseLong(candidate));
                if (card == null || Status.DEL.equals(card.getStatus())) continue;
                tabs.putObject(groupId).put("activeCardId", candidate);
                String title = members.get(candidate).path("title").asText("").trim();
                summary.add(widget.path("title").asText("分组") + "：" + (title.isEmpty() ? card.getCardName() : title));
                break;
            }
        }
        return tabs;
    }

    public record Globals(List<FilterItem> filters, List<FilterItem> params) {}

    /** 订阅查询从服务端快照构造条件，不能被客户端 body 覆盖。 */
    public static Globals globals(VisDashboard dashboard, String stateJson, Long datasetId) {
        JsonNode values = object(stateJson).path("filters");
        List<FilterItem> filters = new ArrayList<>();
        List<FilterItem> params = new ArrayList<>();
        for (var entry : definitions(dashboard).entrySet()) {
            JsonNode def = entry.getValue();
            if (!String.valueOf(datasetId).equals(def.path("datasetId").asText())) continue;
            JsonNode value = values.path(entry.getKey());
            String exp = value.path("valueExp").asText("");
            if (value.path("value").isEmpty() && exp.isBlank()) continue;
            var item = new FilterItem();
            item.setField(def.path("field").asText());
            item.setLabel(label(def));
            item.setValue(JSON.convertValue(value.path("value"), Object[].class));
            if (!exp.isBlank()) item.setValueExp(exp);
            else if (!"param".equals(def.path("applyAs").asText())) {
                String form = def.path("formType").asText();
                String fallback = form.endsWith("Range") ? "between"
                        : Set.of("inputTag", "multiSelect").contains(form) ? "in" : "eq";
                item.setOp(def.path("op").asText(fallback));
            }
            if ("param".equals(def.path("applyAs").asText())) params.add(item);
            else filters.add(item);
        }
        return new Globals(filters, params);
    }

    private ObjectNode signature(JsonNode def) {
        ObjectNode result = JSON.createObjectNode();
        for (String key : List.of("datasetId", "field", "applyAs", "formType", "op", "valueAs"))
            result.put(key, def.path(key).asText(""));
        long datasetId = def.path("datasetId").asLong();
        var dataset = datasets.selectById(datasetId);
        if (dataset == null || !Status.EBL.equals(dataset.getStatus())) return null;
        result.put("sourceId", String.valueOf(dataset.getSourceId()));
        var field = fields.selectOne(Wrappers.<VisDatasetField>lambdaQuery()
                .eq(VisDatasetField::getDatasetId, datasetId).eq(VisDatasetField::getField, def.path("field").asText())
                .eq(VisDatasetField::getStatus, Status.EBL).last("limit 1"));
        // 模板参数不一定是输出字段，但数据集来源仍必须一致。
        if (field == null && !"param".equals(def.path("applyAs").asText())) return null;
        result.put("dataType", field == null ? "PARAM" : field.getDataType());
        return result;
    }

    static ObjectNode normalize(JsonNode def, JsonNode raw) {
        ObjectNode result = JSON.createObjectNode();
        var values = result.putArray("value");
        if (raw.isMissingNode() || raw.isNull()) return result;
        if (!raw.isObject()) throw ResultException.fail("筛选值格式无效");
        raw.fieldNames().forEachRemaining(key -> {
            if (!Set.of("value", "valueExp").contains(key)) throw ResultException.fail("筛选值包含未知字段");
        });
        if (raw.has("value") && !raw.path("value").isArray()) throw ResultException.fail("筛选值必须是数组");
        if (raw.path("value").size() > 200) throw ResultException.fail("筛选值过多");
        for (JsonNode item : raw.path("value")) {
            if (!item.isValueNode() || item.isNull() || item.asText().length() > 1000) throw ResultException.fail("筛选值无效");
            if (!item.asText().isBlank()) values.add(item);
        }
        String form = def.path("formType").asText();
        String exp = raw.path("valueExp").asText("");
        if (!exp.isBlank()) {
            if (!"dateExp".equals(form) || DateValueExpEnum.of(exp) == null) throw ResultException.fail("日期快捷值无效");
            Object[] args = JSON.convertValue(values, Object[].class);
            DateValueExpResolver.resolve(exp, args, LocalDate.now());
            result.put("valueExp", exp);
        } else if (!values.isEmpty()) {
            if ("dateExp".equals(form)) throw ResultException.fail("请选择日期快捷条件");
            boolean range = Set.of("numberRange", "dateRange", "datetimeRange").contains(form)
                    || "between".equals(def.path("op").asText());
            if (range && values.size() != 2) throw ResultException.fail("范围筛选需要两个值");
            if (Set.of("input", "select", "number", "date", "datetime").contains(form) && values.size() != 1)
                throw ResultException.fail("此筛选只允许一个值");
            for (JsonNode item : values) {
                try {
                    if (form.startsWith("number")) new java.math.BigDecimal(item.asText());
                    if (form.startsWith("date") && "timestamp".equals(def.path("valueAs").asText())) Long.parseLong(item.asText());
                    if (form.startsWith("date") && !"timestamp".equals(def.path("valueAs").asText())) {
                        if (form.startsWith("datetime")) java.time.LocalDateTime.parse(item.asText().replace(' ', 'T'));
                        else LocalDate.parse(item.asText());
                    }
                } catch (Exception e) { throw ResultException.fail("筛选值与字段类型不匹配"); }
            }
        }
        return result;
    }

    private static String expressionLabel(JsonNode value) {
        String name = switch (value.path("valueExp").asText()) {
            case "current_day" -> "今天"; case "last_day" -> "昨天";
            case "current_week" -> "本周至今"; case "last_week" -> "上周";
            case "current_month" -> "本月至今"; case "last_month" -> "上月";
            case "current_year" -> "今年至今"; case "last_year" -> "去年";
            case "last_days" -> "最近 N 天"; case "last_xy_days" -> "最近 X–Y 天";
            default -> value.path("valueExp").asText();
        };
        return name + (value.path("value").isEmpty() ? "" : " " + value.path("value"));
    }

    private static String label(JsonNode def) { return def.path("label").asText(def.path("field").asText()); }
    static Map<String, JsonNode> definitions(VisDashboard dashboard) {
        Map<String, JsonNode> result = new LinkedHashMap<>();
        JsonNode root = configuration(dashboard);
        for (JsonNode def : root.path("filters")) {
            String uid = def.path("uid").asText();
            if (uid.isBlank() || result.putIfAbsent(uid, def) != null) throw ResultException.fail("看板筛选定义无效");
        }
        return result;
    }
    private static JsonNode configuration(VisDashboard dashboard) {
        JsonNode root;
        try { root = JSON.readTree(dashboard.getConfigJson()); }
        catch (Exception e) { throw ResultException.fail("看板配置格式无效"); }
        if (root == null || !root.isObject()) throw ResultException.fail("看板配置格式无效");
        return root;
    }

    public static ObjectNode object(String json) {
        try {
            if (json == null || json.length() > 32768) throw new IllegalArgumentException();
            JsonNode parsed = JSON.readTree(json);
            if (!(parsed instanceof ObjectNode object)) throw new IllegalArgumentException();
            return object;
        } catch (Exception e) { throw ResultException.fail("视图配置格式无效"); }
    }
}
