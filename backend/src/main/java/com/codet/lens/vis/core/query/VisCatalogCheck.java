package com.codet.lens.vis.core.query;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.ResultEnum;
import com.codet.lens.common.ResultException;
import com.codet.lens.vis.rds.core.SqlFieldTypes;
import com.codet.lens.vis.rds.dto.conf.ConfSqlFieldInfo;
import com.codet.lens.vis.dto.item.DimensionItem;
import com.codet.lens.vis.dto.item.FilterGroup;
import com.codet.lens.vis.dto.item.FilterItem;
import com.codet.lens.vis.dto.item.MetricItem;
import com.codet.lens.vis.dto.pivot.PivotQueryRequest;
import com.codet.lens.vis.dto.query.DetailQueryRequest;
import com.codet.lens.vis.dto.query.QueryConfig;
import com.codet.lens.vis.dto.query.QueryRequest;
import com.codet.lens.vis.enums.AggFunctionEnum;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 查询前对照数据集字段目录。不校验 Enjoy 参数、公式内部列、结果列过滤。
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VisCatalogCheck {

    public static void check(List<ConfSqlFieldInfo> catalog, String datasetName, Usage usage) {
        if (CollUtil.isEmpty(catalog)) {
            throw fail(datasetLabel(datasetName) + "未配置字段，无法查询，请联系配置人");
        }
        Map<String, ConfSqlFieldInfo> byField = index(catalog);
        Set<String> missing = new LinkedHashSet<>();
        Set<String> typeIssues = new LinkedHashSet<>();
        if (usage == null) {
            return;
        }
        collectDims(usage.getDimensions(), byField, missing, typeIssues);
        collectMetrics(usage.getMetrics(), byField, missing, typeIssues);
        if (CollUtil.isNotEmpty(usage.getFilters())) {
            for (FilterGroup group : usage.getFilters()) {
                if (group != null) {
                    collectFilters(group.getConditions(), byField, missing, typeIssues);
                }
            }
        }
        collectFilters(usage.getExtraFilters(), byField, missing, typeIssues);
        if (missing.isEmpty() && typeIssues.isEmpty()) {
            return;
        }
        StringBuilder msg = new StringBuilder("图表无法查询：");
        if (!missing.isEmpty()) {
            msg.append("字段 ").append(String.join("、", missing)).append(" 已不在数据集中");
        }
        if (!typeIssues.isEmpty()) {
            if (!missing.isEmpty()) {
                msg.append("；");
            }
            msg.append(String.join("；", typeIssues));
        }
        msg.append("。请联系配置人");
        throw fail(msg.toString());
    }

    public static void check(List<ConfSqlFieldInfo> catalog, String datasetName, QueryRequest request) {
        check(catalog, datasetName, usage(request));
    }

    public static void check(List<ConfSqlFieldInfo> catalog, String datasetName, PivotQueryRequest request) {
        check(catalog, datasetName, usage(request));
    }

    public static void check(List<ConfSqlFieldInfo> catalog, String datasetName, DetailQueryRequest request) {
        check(catalog, datasetName, usage(request));
    }

    public static Usage usage(QueryRequest request) {
        Usage usage = new Usage();
        if (request == null) {
            return usage;
        }
        QueryConfig query = request.getQuery();
        if (query != null) {
            usage.setDimensions(query.getDimensions());
            usage.setMetrics(query.getMetrics());
            usage.setFilters(query.getFilters());
        }
        usage.setExtraFilters(request.getGlobalFilters());
        return usage;
    }

    public static Usage usage(PivotQueryRequest request) {
        Usage usage = new Usage();
        if (request == null) {
            return usage;
        }
        if (request.getQuery() != null) {
            List<DimensionItem> dims = new ArrayList<>();
            if (CollUtil.isNotEmpty(request.getQuery().getRowDimensions())) {
                dims.addAll(request.getQuery().getRowDimensions());
            }
            if (CollUtil.isNotEmpty(request.getQuery().getColDimensions())) {
                dims.addAll(request.getQuery().getColDimensions());
            }
            usage.setDimensions(dims);
            usage.setMetrics(request.getQuery().getMetrics());
            usage.setFilters(request.getQuery().getFilters());
        }
        usage.setExtraFilters(request.getGlobalFilters());
        return usage;
    }

    public static Usage usage(DetailQueryRequest request) {
        Usage usage = new Usage();
        if (request == null) {
            return usage;
        }
        if (request.getQuery() != null) {
            usage.setDimensions(request.getQuery().getDimensions());
            usage.setFilters(request.getQuery().getFilters());
        }
        List<FilterItem> extra = new ArrayList<>();
        if (CollUtil.isNotEmpty(request.getGlobalFilters())) {
            extra.addAll(request.getGlobalFilters());
        }
        if (CollUtil.isNotEmpty(request.getContextFilters())) {
            extra.addAll(request.getContextFilters());
        }
        usage.setExtraFilters(extra);
        return usage;
    }

    private static void collectDims(List<DimensionItem> dims, Map<String, ConfSqlFieldInfo> byField,
                                    Set<String> missing, Set<String> typeIssues) {
        if (CollUtil.isEmpty(dims)) {
            return;
        }
        for (DimensionItem dim : dims) {
            if (dim == null || StrUtil.isBlank(dim.getField())) {
                continue;
            }
            ConfSqlFieldInfo info = lookup(byField, dim.getField(), dim.getLabel(), missing);
            if (info != null && StrUtil.isNotBlank(dim.getTimeGrain())) {
                requireDate(info, dim.getField(), dim.getLabel(), typeIssues);
            }
        }
    }

    private static void collectMetrics(List<MetricItem> metrics, Map<String, ConfSqlFieldInfo> byField,
                                       Set<String> missing, Set<String> typeIssues) {
        if (CollUtil.isEmpty(metrics)) {
            return;
        }
        for (MetricItem metric : metrics) {
            if (metric == null || StrUtil.isBlank(metric.getField())) {
                continue;
            }
            ConfSqlFieldInfo info = lookup(byField, metric.getField(), metric.getLabel(), missing);
            if (info != null && needsNumber(metric.getAgg())) {
                requireNumber(info, metric.getField(), metric.getLabel(), typeIssues);
            }
            if (metric.getContrast() != null && StrUtil.isNotBlank(metric.getContrast().getTimeField())) {
                String timeField = metric.getContrast().getTimeField();
                ConfSqlFieldInfo timeInfo = lookup(byField, timeField, null, missing);
                if (timeInfo != null) {
                    requireDate(timeInfo, timeField, null, typeIssues);
                }
            }
        }
    }

    private static void collectFilters(List<FilterItem> filters, Map<String, ConfSqlFieldInfo> byField,
                                       Set<String> missing, Set<String> typeIssues) {
        if (CollUtil.isEmpty(filters)) {
            return;
        }
        for (FilterItem item : filters) {
            if (item == null || StrUtil.isBlank(item.getField())) {
                continue;
            }
            ConfSqlFieldInfo info = lookup(byField, item.getField(), item.getLabel(), missing);
            if (info != null && (StrUtil.isNotBlank(item.getTimeGrain()) || StrUtil.isNotBlank(item.getValueExp()))) {
                requireDate(info, item.getField(), item.getLabel(), typeIssues);
            }
        }
    }

    private static ConfSqlFieldInfo lookup(Map<String, ConfSqlFieldInfo> byField, String field, String label,
                                           Set<String> missing) {
        ConfSqlFieldInfo info = byField.get(field.trim());
        if (info == null) {
            missing.add(display(field, label));
        }
        return info;
    }

    private static void requireDate(ConfSqlFieldInfo info, String field, String label, Set<String> typeIssues) {
        if (!isDate(info.getDataType())) {
            typeIssues.add(display(field, label) + " 不是日期字段，不能按时间统计");
        }
    }

    private static void requireNumber(ConfSqlFieldInfo info, String field, String label, Set<String> typeIssues) {
        if (!SqlFieldTypes.NUMBER.equals(info.getDataType())) {
            typeIssues.add(display(field, label) + " 不是数值字段，不能求和/平均");
        }
    }

    private static boolean needsNumber(String agg) {
        return AggFunctionEnum.SUM.getCode().equalsIgnoreCase(agg)
                || AggFunctionEnum.AVG.getCode().equalsIgnoreCase(agg);
    }

    private static boolean isDate(String dataType) {
        return SqlFieldTypes.DATE.equals(dataType) || SqlFieldTypes.DATETIME.equals(dataType);
    }

    private static Map<String, ConfSqlFieldInfo> index(List<ConfSqlFieldInfo> catalog) {
        Map<String, ConfSqlFieldInfo> byField = new LinkedHashMap<>();
        for (ConfSqlFieldInfo item : catalog) {
            if (item != null && StrUtil.isNotBlank(item.getField())) {
                byField.putIfAbsent(item.getField().trim(), item);
            }
        }
        return byField;
    }

    private static String display(String field, String label) {
        String name = field == null ? "" : field.trim();
        String shown = label == null ? "" : label.trim();
        if (StrUtil.isNotBlank(shown) && !shown.equals(name)) {
            return shown + "（" + name + "）";
        }
        return StrUtil.isNotBlank(shown) ? shown : name;
    }

    private static String datasetLabel(String datasetName) {
        return StrUtil.isBlank(datasetName) ? "数据集" : "数据集「" + datasetName + "」";
    }

    private static ResultException fail(String msg) {
        return new ResultException(ResultEnum.FAIL.getCode(), msg);
    }

    @Getter
    @Setter
    public static class Usage {
        private List<DimensionItem> dimensions;
        private List<MetricItem> metrics;
        private List<FilterGroup> filters;
        private List<FilterItem> extraFilters;
    }
}
