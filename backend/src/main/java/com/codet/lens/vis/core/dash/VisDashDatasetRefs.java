package com.codet.lens.vis.core.dash;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.dataset.DatasetDashboardRefInfo.Reference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** 提取已保存过滤器的数据集引用；解析失败不能作为“没有依赖”。 */
public final class VisDashDatasetRefs {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private VisDashDatasetRefs() {
    }

    public static List<Reference> collect(String configJson, Set<Long> datasetIds) {
        if (configJson == null || configJson.isBlank()) {
            return List.of();
        }
        try {
            JsonNode root = MAPPER.readTree(configJson);
            if (root == null || !root.isObject()) {
                throw new IllegalArgumentException("Invalid dashboard config");
            }
            JsonNode filters = root.get("filters");
            if (filters == null || filters.isNull()) {
                return List.of();
            }
            if (!filters.isArray()) {
                throw new IllegalArgumentException("Invalid filters");
            }
            List<Reference> refs = new ArrayList<>();
            for (JsonNode filter : filters) {
                if (!filter.isObject()) {
                    continue;
                }
                String name = filter.path("label").asText("").trim();
                if (name.isEmpty()) {
                    name = filter.path("field").asText("筛选项");
                }
                if (matches(filter.get("datasetId"), datasetIds)) {
                    refs.add(new Reference("FILTER", name));
                }
                JsonNode options = filter.path("options");
                if ("dataset".equals(options.path("source").asText())
                        && matches(options.get("datasetId"), datasetIds)) {
                    refs.add(new Reference("OPTIONS", name));
                }
            }
            return refs;
        } catch (Exception e) {
            throw ResultException.fail("看板配置异常，暂时无法检查关联");
        }
    }

    private static boolean matches(JsonNode node, Set<Long> ids) {
        if (node == null || node.isNull()) {
            return false;
        }
        if (!node.isIntegralNumber() && !node.isTextual()) {
            return false;
        }
        try {
            return ids.contains(Long.valueOf(node.asText().trim()));
        } catch (NumberFormatException ignored) {
            return false;
        }
    }
}
