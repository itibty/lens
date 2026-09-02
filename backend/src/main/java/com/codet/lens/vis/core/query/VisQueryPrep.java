package com.codet.lens.vis.core.query;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.base.ResultEnum;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.item.*;
import com.codet.lens.vis.dto.pivot.PivotQueryConfig;
import com.codet.lens.vis.dto.pivot.PivotQueryRequest;
import com.codet.lens.vis.dto.query.*;
import com.codet.lens.vis.enums.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 卡片配置完整性校验 + 全局空项过滤。拼 SQL 层不再重复这些检查。
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class VisQueryPrep {

    private static final Pattern SAFE_FIELD = Pattern.compile("^[a-zA-Z0-9_\\u4e00-\\u9fa5]+$");

    @Getter
    public static final class Prepared {
        /** 模板参数 */
        private final Map<String, Object> enjoyParams;
        /** 行级过滤 */
        private final List<FilterGroup> filters;
        /** 日期快捷基准日 */
        private final LocalDate asOfDate;

        private Prepared(Map<String, Object> enjoyParams, List<FilterGroup> filters, LocalDate asOfDate) {
            this.enjoyParams = enjoyParams;
            this.filters = filters;
            this.asOfDate = asOfDate;
        }
    }

    public static Prepared prepare(QueryRequest request) {
        if (request == null || request.getQuery() == null) {
            throw fail("query 不能为空");
        }
        QueryConfig config = request.getQuery();
        LocalDate asOfDate = parseAsOfDate(config.getAsOfDate());
        ChartTypeEnum chartType = validateVisual(request.getVisual(), false);
        if (config.getDatasetId() == null) {
            throw fail("datasetId 不能为空");
        }
        validateDimensions(config.getDimensions(), "dimensions");
        validateMetrics(config.getMetrics(), false, true, asOfDate);
        if (CollUtil.isEmpty(config.getDimensions()) && CollUtil.isEmpty(config.getMetrics())) {
            throw fail("dimensions 和 metrics 不能同时为空");
        }
        validateCardShape(chartType, config);
        validateCommon(config.getFilters(), config.getParams(), config.getHavingFilters(),
                config.getResultFilters(), config.getOrderList(), asOfDate,
                selectAliases(config.getDimensions(), null, config.getMetrics()));
        return new Prepared(
                VisParamHelper.toEnjoyMap(config.getParams(), keepComplete(request.getGlobalParams(), true, asOfDate),
                        asOfDate),
                mergeFilters(config.getFilters(), keepComplete(request.getGlobalFilters(), false, asOfDate)),
                asOfDate
        );
    }

    public static Prepared preparePivot(PivotQueryRequest request) {
        if (request == null || request.getQuery() == null) {
            throw fail("query 不能为空");
        }
        PivotQueryConfig config = request.getQuery();
        LocalDate asOfDate = parseAsOfDate(config.getAsOfDate());
        validateVisual(request.getVisual(), true);
        if (config.getDatasetId() == null) {
            throw fail("datasetId 不能为空");
        }
        validateDimensions(config.getRowDimensions(), "rowDimensions");
        validateDimensions(config.getColDimensions(), "colDimensions");
        validateMetrics(config.getMetrics(), true, false, asOfDate);
        validateCommon(config.getFilters(), config.getParams(), config.getHavingFilters(),
                null, config.getOrderList(), asOfDate,
                selectAliases(config.getRowDimensions(), config.getColDimensions(), config.getMetrics()));
        return new Prepared(
                VisParamHelper.toEnjoyMap(config.getParams(), keepComplete(request.getGlobalParams(), true, asOfDate),
                        asOfDate),
                mergeFilters(config.getFilters(), keepComplete(request.getGlobalFilters(), false, asOfDate)),
                asOfDate
        );
    }

    /**
     * 明细：不校验图表形态 / 维度指标。忽略 having、结果列过滤、排序。
     * 点击维值叠到行级过滤；未带 timeGrain 时从 query.dimensions 补。
     */
    public static Prepared prepareDetail(DetailQueryRequest request) {
        if (request == null || request.getQuery() == null) {
            throw fail("query 不能为空");
        }
        QueryConfig config = request.getQuery();
        LocalDate asOfDate = parseAsOfDate(config.getAsOfDate());
        if (config.getDatasetId() == null) {
            throw fail("datasetId 不能为空");
        }
        validateDimensions(config.getDimensions(), "dimensions");
        validateFilterGroups(config.getFilters(), asOfDate);
        validateCardParams(config.getParams(), asOfDate);
        if (CollUtil.isNotEmpty(request.getContextFilters())) {
            for (FilterItem item : request.getContextFilters()) {
                isCompleteFilter(item, true, asOfDate);
            }
        }
        applyContextGrain(request.getContextFilters(), config.getDimensions());
        List<FilterGroup> filters = mergeFilters(config.getFilters(),
                keepComplete(request.getGlobalFilters(), false, asOfDate));
        if (CollUtil.isNotEmpty(request.getContextFilters())) {
            FilterGroup contextGroup = new FilterGroup();
            contextGroup.setCombineOp("and");
            contextGroup.setConditions(request.getContextFilters());
            filters.add(contextGroup);
        }
        return new Prepared(
                VisParamHelper.toEnjoyMap(config.getParams(), keepComplete(request.getGlobalParams(), true, asOfDate),
                        asOfDate),
                filters,
                asOfDate
        );
    }

    private static void applyContextGrain(List<FilterItem> contextFilters, List<DimensionItem> dimensions) {
        if (CollUtil.isEmpty(contextFilters)) {
            return;
        }
        Map<String, String> grainByField = new HashMap<>();
        if (CollUtil.isNotEmpty(dimensions)) {
            for (DimensionItem dim : dimensions) {
                if (dim != null && StrUtil.isNotBlank(dim.getField()) && StrUtil.isNotBlank(dim.getTimeGrain())) {
                    grainByField.putIfAbsent(dim.getField(), dim.getTimeGrain());
                }
            }
        }
        for (FilterItem item : contextFilters) {
            if (item == null) {
                continue;
            }
            if (StrUtil.isBlank(item.getTimeGrain()) && grainByField.containsKey(item.getField())) {
                item.setTimeGrain(grainByField.get(item.getField()));
            }
            if (StrUtil.isNotBlank(item.getTimeGrain()) && TimeGrainEnum.of(item.getTimeGrain()) == null) {
                throw fail("不支持的时间粒度: " + item.getTimeGrain());
            }
        }
    }

    private static void validateCommon(List<FilterGroup> filters, List<FilterItem> params,
                                       List<HavingFilterItem> havings, List<FilterItem> resultFilters,
                                       List<OrderItem> orders, LocalDate today, Set<String> selectAliases) {
        validateFilterGroups(filters, today);
        validateCardParams(params, today);
        validateHavings(havings, today);
        validateResultFilters(resultFilters, today);
        validateOrders(orders, selectAliases);
    }

    /** SELECT 别名：有 label 用 label，否则用 field。ORDER BY 按此校验，不改写调用方传入值。 */
    private static Set<String> selectAliases(List<DimensionItem> dims, List<DimensionItem> extraDims,
                                             List<MetricItem> metrics) {
        Set<String> aliases = new LinkedHashSet<>();
        addDimAliases(aliases, dims);
        addDimAliases(aliases, extraDims);
        if (CollUtil.isNotEmpty(metrics)) {
            for (MetricItem metric : metrics) {
                if (metric != null) {
                    aliases.add(SqlExprHelper.resolveMetricAlias(metric));
                }
            }
        }
        return aliases;
    }

    private static void addDimAliases(Set<String> aliases, List<DimensionItem> dims) {
        if (CollUtil.isEmpty(dims)) {
            return;
        }
        for (DimensionItem dim : dims) {
            if (dim != null) {
                aliases.add(SqlExprHelper.resolveDimAlias(dim));
            }
        }
    }

    private static List<FilterItem> keepComplete(List<FilterItem> items, boolean asParam, LocalDate today) {
        List<FilterItem> kept = new ArrayList<>();
        if (CollUtil.isEmpty(items)) {
            return kept;
        }
        for (FilterItem item : items) {
            if (asParam ? isCompleteParam(item, false, today) : isCompleteFilter(item, false, today)) {
                kept.add(item);
            }
        }
        return kept;
    }

    private static List<FilterGroup> mergeFilters(List<FilterGroup> cardGroups, List<FilterItem> globalFilters) {
        List<FilterGroup> groups = cardGroups != null ? new ArrayList<>(cardGroups) : new ArrayList<>();
        if (CollUtil.isNotEmpty(globalFilters)) {
            FilterGroup globalGroup = new FilterGroup();
            globalGroup.setCombineOp("and");
            globalGroup.setConditions(globalFilters);
            groups.add(globalGroup);
        }
        return groups;
    }

    private static ChartTypeEnum validateVisual(Map<String, Object> visual, boolean pivot) {
        if (visual == null) {
            throw fail("visual 不能为空");
        }
        Object raw = visual.get("chartType");
        String chartType = raw == null ? null : String.valueOf(raw);
        if (StrUtil.isBlank(chartType)) {
            throw fail("chartType 不能为空");
        }
        ChartTypeEnum type = ChartTypeEnum.of(chartType);
        if (type == null) {
            throw fail("不支持的图表类型: " + chartType);
        }
        if (pivot) {
            if (type != ChartTypeEnum.PIVOT) {
                throw fail("透视查询 chartType 必须是 pivot");
            }
        } else if (type == ChartTypeEnum.PIVOT) {
            throw fail("chartType=pivot 请使用透视查询");
        }
        return type;
    }

    private static void validateCardShape(ChartTypeEnum type, QueryConfig config) {
        int dimCount = CollUtil.size(config.getDimensions());
        int metricCount = CollUtil.size(config.getMetrics());
        if (type == ChartTypeEnum.NUMBER) {
            if (dimCount > 0) {
                throw fail("数字卡片不支持维度");
            }
            if (metricCount < 1) {
                throw fail("数字卡片至少需要 1 个指标");
            }
            return;
        }
        if (type == ChartTypeEnum.PIE) {
            if (dimCount != 1) {
                throw fail("饼图需要恰好 1 个维度");
            }
            if (metricCount < 1) {
                throw fail("饼图至少需要 1 个指标");
            }
            return;
        }
        if (type == ChartTypeEnum.KPI) {
            if (dimCount != 1) {
                throw fail("KPI图需要恰好 1 个维度");
            }
            if (metricCount < 1) {
                throw fail("KPI图至少需要 1 个指标");
            }
            return;
        }
        if (type == ChartTypeEnum.HEATMAP) {
            if (dimCount != 2) {
                throw fail("热力图需要恰好 2 个维度");
            }
            if (metricCount != 1) {
                throw fail("热力图需要恰好 1 个指标");
            }
            return;
        }
        if (type == ChartTypeEnum.TREEMAP) {
            if (dimCount < 1 || dimCount > 3) {
                throw fail("矩形树图需要 1 到 3 个维度");
            }
            if (metricCount != 1) {
                throw fail("矩形树图需要恰好 1 个指标");
            }
            return;
        }
        if (type == ChartTypeEnum.WATERFALL) {
            if (dimCount != 1) {
                throw fail("瀑布图需要恰好 1 个维度");
            }
            if (metricCount != 1) {
                throw fail("瀑布图需要恰好 1 个指标");
            }
            return;
        }
        if (type == ChartTypeEnum.TREND) {
            if (dimCount != 1) {
                throw fail("趋势指标卡需要恰好 1 个维度");
            }
            if (metricCount < 1) {
                throw fail("趋势指标卡至少需要 1 个指标");
            }
            return;
        }
        if (type == ChartTypeEnum.TORNADO) {
            if (dimCount != 1) {
                throw fail("对比条需要恰好 1 个维度");
            }
            if (metricCount != 2) {
                throw fail("对比条需要恰好 2 个指标");
            }
            return;
        }
        if (type == ChartTypeEnum.RANK) {
            if (dimCount != 1) {
                throw fail("排行榜需要恰好 1 个维度");
            }
            if (metricCount != 1) {
                throw fail("排行榜需要恰好 1 个指标");
            }
        }
    }

    private static void validateDimensions(List<DimensionItem> dims, String name) {
        if (CollUtil.isEmpty(dims)) {
            return;
        }
        for (DimensionItem dim : dims) {
            if (dim == null || StrUtil.isBlank(dim.getField())) {
                throw fail(name + ".field 不能为空");
            }
            validateField(dim.getField());
            if (StrUtil.isNotBlank(dim.getTimeGrain()) && TimeGrainEnum.of(dim.getTimeGrain()) == null) {
                throw fail("不支持的时间粒度: " + dim.getTimeGrain());
            }
        }
    }

    /**
     * 透视不允许 contrast。日期维 + 同环比设计器会拦，此处不拒，JOIN 仍按全部维度对齐。
     */
    private static void validateMetrics(List<MetricItem> metrics, boolean required, boolean allowContrast,
                                        LocalDate today) {
        if (CollUtil.isEmpty(metrics)) {
            if (required) {
                throw fail("metrics 不能为空");
            }
            return;
        }
        Set<String> aliases = new HashSet<>();
        boolean anyContrast = false;
        for (MetricItem metric : metrics) {
            if (metric == null) {
                throw fail("metric 不能为空");
            }
            if (StrUtil.isBlank(metric.getField())) {
                throw fail("metric.field 不能为空");
            }
            validateField(metric.getField());
            if (StrUtil.isBlank(metric.getFormula()) && StrUtil.isBlank(metric.getAgg())) {
                throw fail("metric 的 formula 和 agg 不能同时为空");
            }
            if (StrUtil.isNotBlank(metric.getAgg())) {
                validateAgg(metric.getAgg());
            }
            if (metric.getContrast() != null) {
                if (!allowContrast) {
                    throw fail("透视不支持对比指标");
                }
                anyContrast = true;
                validateContrast(metric, today);
            }
        }
        if (anyContrast) {
            for (MetricItem metric : metrics) {
                String alias = SqlExprHelper.resolveMetricAlias(metric);
                if (!aliases.add(alias)) {
                    throw fail("指标列名重复: " + alias);
                }
            }
        }
    }

    private static void validateFilterGroups(List<FilterGroup> groups, LocalDate today) {
        if (CollUtil.isEmpty(groups)) {
            return;
        }
        for (FilterGroup group : groups) {
            validateFilterGroup(group);
            for (FilterItem item : group.getConditions()) {
                isCompleteFilter(item, true, today);
            }
        }
    }

    private static void validateCardParams(List<FilterItem> params, LocalDate today) {
        if (CollUtil.isEmpty(params)) {
            return;
        }
        for (FilterItem item : params) {
            isCompleteParam(item, true, today);
        }
    }

    private static void validateHavings(List<HavingFilterItem> havings, LocalDate today) {
        if (CollUtil.isEmpty(havings)) {
            return;
        }
        for (HavingFilterItem item : havings) {
            if (item == null || StrUtil.isBlank(item.getField())) {
                throw fail("having.field 不能为空");
            }
            validateField(item.getField());
            if (StrUtil.isBlank(item.getFormula()) && StrUtil.isBlank(item.getAgg())) {
                throw fail("having 的 formula 和 agg 不能同时为空");
            }
            if (StrUtil.isNotBlank(item.getAgg())) {
                validateAgg(item.getAgg());
            }
            isCompleteFilter(item, true, today);
        }
    }

    private static void validateResultFilters(List<FilterItem> resultFilters, LocalDate today) {
        if (CollUtil.isEmpty(resultFilters)) {
            return;
        }
        for (FilterItem item : resultFilters) {
            if (item == null || StrUtil.isBlank(item.getField())) {
                throw fail("resultFilters.field 不能为空");
            }
            validateField(item.getField());
            isCompleteFilter(item, true, today);
        }
    }

    private static void validateContrast(MetricItem metric, LocalDate today) {
        if (StrUtil.isBlank(metric.getLabel())) {
            throw fail("对比指标 label 不能为空");
        }
        validateField(metric.getLabel());
        ContrastConfig contrast = metric.getContrast();
        if (StrUtil.isBlank(contrast.getTimeField())) {
            throw fail("contrast.timeField 不能为空");
        }
        validateField(contrast.getTimeField());
        if (ContrastMethodEnum.of(contrast.getCalcMethod()) == null) {
            throw fail("不支持的对比算法: " + contrast.getCalcMethod());
        }
        if (ContrastCalcTypeEnum.of(contrast.getCalcType()) == null) {
            throw fail("contrast.calcType 只支持 diff/diffRate");
        }
        if (StrUtil.isBlank(contrast.getValueExp())) {
            throw fail("contrast.valueExp 不能为空");
        }
        ContrastWindowResolver.resolve(contrast, today);
    }

    private static void validateOrders(List<OrderItem> orders, Set<String> selectAliases) {
        if (CollUtil.isEmpty(orders)) {
            return;
        }
        for (OrderItem order : orders) {
            if (order == null || StrUtil.isBlank(order.getField())) {
                throw fail("order.field 不能为空");
            }
            validateField(order.getField());
            if (StrUtil.isBlank(order.getDir())) {
                throw fail("order.dir 不能为空");
            }
            if (!SortDirEnum.ASC.getCode().equalsIgnoreCase(order.getDir())
                    && !SortDirEnum.DESC.getCode().equalsIgnoreCase(order.getDir())) {
                throw fail("order.dir 只支持 asc/desc: " + order.getDir());
            }
            if (!selectAliases.contains(order.getField())) {
                throw fail("order.field 必须是 SELECT 别名: " + order.getField());
            }
        }
    }

    /**
     * @param strict true=卡片（不全抛错），false=全局（不全返回 false；写错仍抛）
     */
    private static boolean isCompleteParam(FilterItem item, boolean strict, LocalDate today) {
        if (item == null || StrUtil.isBlank(item.getField())) {
            if (strict) {
                throw fail("params.field 不能为空");
            }
            return false;
        }
        validateField(item.getField());
        if (StrUtil.isNotBlank(item.getValueExp())) {
            return checkValueExp(item.getValueExp(), item.getValue(), strict, today);
        }
        if (item.getValue() == null || item.getValue().length == 0) {
            if (strict) {
                throw fail("params 需要 value 或 valueExp: " + item.getField());
            }
            return false;
        }
        return true;
    }

    private static boolean isCompleteFilter(FilterItem item, boolean strict, LocalDate today) {
        if (item == null || StrUtil.isBlank(item.getField())) {
            if (strict) {
                throw fail("filter.field 不能为空");
            }
            return false;
        }
        validateField(item.getField());
        if (StrUtil.isNotBlank(item.getValueExp())) {
            return checkValueExp(item.getValueExp(), item.getValue(), strict, today);
        }
        if (StrUtil.isBlank(item.getOp())) {
            if (strict) {
                throw fail("filter.op 不能为空: " + item.getField());
            }
            return false;
        }
        FilterOpEnum opEnum = FilterOpEnum.of(item.getOp());
        if (opEnum == null) {
            throw fail("不支持的操作符: " + item.getOp());
        }
        if (opEnum == FilterOpEnum.IS_NULL || opEnum == FilterOpEnum.IS_NOT_NULL) {
            return true;
        }
        if (item.getValue() == null || item.getValue().length == 0) {
            if (strict) {
                throw fail("filter value 不能为空: " + item.getField());
            }
            return false;
        }
        if (opEnum == FilterOpEnum.BETWEEN && item.getValue().length < 2) {
            if (strict) {
                throw fail("between 需要 2 个值");
            }
            return false;
        }
        return true;
    }

    private static boolean checkValueExp(String valueExp, Object[] value, boolean strict, LocalDate today) {
        DateValueExpEnum exp = DateValueExpEnum.of(valueExp);
        if (exp == null) {
            throw fail("不支持的日期快捷表达式: " + valueExp);
        }
        if (exp.getValueCount() > 0 && (value == null || value.length < exp.getValueCount())) {
            if (strict) {
                throw fail(exp.getCode() + " 需要 " + exp.getValueCount() + " 个 value");
            }
            return false;
        }
        DateValueExpResolver.resolve(valueExp, value, today != null ? today : LocalDate.now());
        return true;
    }

    public static LocalDate parseAsOfDate(String raw) {
        if (StrUtil.isBlank(raw)) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(raw.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (DateTimeParseException e) {
            throw fail("asOfDate 必须是 yyyy-MM-dd: " + raw);
        }
    }

    private static void validateField(String field) {
        if (StrUtil.isBlank(field) || !SAFE_FIELD.matcher(field).matches()) {
            throw fail("非法字段名: " + field);
        }
    }

    private static void validateAgg(String agg) {
        if (StrUtil.isBlank(agg)) {
            throw fail("聚合函数不能为空");
        }
        try {
            AggFunctionEnum.valueOf(agg.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw fail("不支持的聚合函数: " + agg);
        }
    }

    private static void validateFilterGroup(FilterGroup group) {
        if (group == null) {
            throw fail("filterGroup 不能为空");
        }
        if (StrUtil.isBlank(group.getCombineOp())) {
            throw fail("filterGroup.combineOp 不能为空");
        }
        if (!"and".equalsIgnoreCase(group.getCombineOp()) && !"or".equalsIgnoreCase(group.getCombineOp())) {
            throw fail("filterGroup.combineOp 只支持 and/or: " + group.getCombineOp());
        }
        if (CollUtil.isEmpty(group.getConditions())) {
            throw fail("filterGroup.conditions 不能为空");
        }
    }

    private static ResultException fail(String msg) {
        return new ResultException(ResultEnum.FAIL.getCode(), msg);
    }
}
