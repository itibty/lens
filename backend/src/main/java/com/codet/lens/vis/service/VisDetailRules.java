package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.core.query.SqlExprHelper;
import com.codet.lens.vis.dto.item.DimensionItem;
import com.codet.lens.vis.dto.item.MetricItem;
import com.codet.lens.vis.dto.item.OrderItem;
import com.codet.lens.vis.dto.query.DetailConfig;
import com.codet.lens.vis.dto.query.DetailQueryRequest;
import com.codet.lens.vis.dto.query.QueryConfig;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 同数据集明细：选择原始列，继承来源筛选，独立排序和限量。 */
@Service
@RequiredArgsConstructor
public class VisDetailRules {
    public static final int DEFAULT_LIMIT = 1000;
    public static final int MAX_LIMIT = 5000;
    private static final ObjectMapper JSON = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private final VisDatasetService datasets;

    public void validateSaved(String queryJson, String visualJson) {
        try {
            var visual = JSON.readTree(visualJson);
            if (!visual.path("allowDetail").asBoolean()) {
                return;
            }
            DetailQueryRequest request = new DetailQueryRequest();
            request.setQuery(readQuery(queryJson));
            if (visual.hasNonNull("detail")) {
                request.setDetail(JSON.treeToValue(visual.get("detail"), DetailConfig.class));
            }
            resolve(request);
        } catch (ResultException e) {
            throw e;
        } catch (Exception e) {
            throw ResultException.fail("明细配置无效");
        }
    }

    /** 将透视的行列维合并为明细点击范围，保留时间粒度；展示字段仍由明细配置决定。 */
    public static QueryConfig readQuery(String json) {
        try {
            var root = JSON.readTree(json);
            QueryConfig query = JSON.treeToValue(root, QueryConfig.class);
            if (root.has("rowDimensions") || root.has("colDimensions")) {
                List<DimensionItem> dimensions = new ArrayList<>();
                for (String key : List.of("rowDimensions", "colDimensions")) {
                    for (var item : root.path(key)) {
                        dimensions.add(JSON.treeToValue(item, DimensionItem.class));
                    }
                }
                query.setDimensions(dimensions);
            }
            return query;
        } catch (Exception e) {
            throw ResultException.fail("卡片查询配置无效");
        }
    }

    public DetailQueryRequest resolve(DetailQueryRequest request) {
        QueryConfig query = request.getQuery();
        if (query == null || query.getDatasetId() == null) {
            throw ResultException.fail("数据集不能为空");
        }
        if (request.getMetric() != null && !request.getMetric().isBlank()) {
            MetricItem selected = (query.getMetrics() == null ? List.<MetricItem>of() : query.getMetrics()).stream()
                    .filter(metric -> Objects.equals(SqlExprHelper.resolveMetricAlias(metric), request.getMetric()))
                    .findFirst().orElseThrow(() -> ResultException.fail("明细指标已不存在，请刷新卡片"));
            if (selected.getContrast() != null) {
                throw ResultException.fail("对比指标暂不支持查看明细");
            }
        }
        DetailConfig config = request.getDetail() == null ? new DetailConfig() : request.getDetail();
        List<String> fields = config.getFields();
        if (fields == null || fields.isEmpty() || fields.stream().anyMatch(field -> field == null || field.isBlank())) {
            throw ResultException.fail("请至少选择一个明细字段");
        }
        var available = datasets.listFields(query.getDatasetId()).stream().map(item -> item.getField()).toList();
        if (!available.containsAll(fields)) {
            throw ResultException.fail("明细字段已不可用，请重新选择");
        }
        for (var order : config.getOrderList() == null ? List.<OrderItem>of() : config.getOrderList()) {
            if (order == null || !fields.contains(order.getField())
                    || !("asc".equalsIgnoreCase(order.getDir()) || "desc".equalsIgnoreCase(order.getDir()))) {
                throw ResultException.fail("明细排序需选择已展示字段及升降序");
            }
        }
        int limit = config.getLimit() == null ? DEFAULT_LIMIT : config.getLimit();
        if (limit < 1 || limit > MAX_LIMIT) {
            throw ResultException.fail("明细最多行数须在 1～" + MAX_LIMIT + " 之间");
        }
        request.setSelectFields(fields.stream().distinct().toList());
        query.setLimit(limit);
        query.setOrderList(config.getOrderList());
        return request;
    }
}
