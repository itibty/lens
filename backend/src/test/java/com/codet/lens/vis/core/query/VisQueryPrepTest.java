package com.codet.lens.vis.core.query;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.item.ContrastConfig;
import com.codet.lens.vis.dto.item.DimensionItem;
import com.codet.lens.vis.dto.item.FilterItem;
import com.codet.lens.vis.dto.item.MetricItem;
import com.codet.lens.vis.dto.item.OrderItem;
import com.codet.lens.vis.dto.pivot.PivotQueryConfig;
import com.codet.lens.vis.dto.pivot.PivotQueryRequest;
import com.codet.lens.vis.dto.query.QueryConfig;
import com.codet.lens.vis.dto.query.QueryRequest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VisQueryPrepTest {

    @ParameterizedTest
    @ValueSource(strings = {"tornado", "unknown"})
    void rejectsUnsupportedChartTypes(String chartType) {
        ResultException error = assertThrows(ResultException.class,
                () -> VisQueryPrep.prepare(request(chartType, 1, 2)));

        assertEquals("不支持的图表类型: " + chartType, error.getMsg());
    }

    @ParameterizedTest(name = "{0}: {1} dimensions, {2} metrics")
    @MethodSource("validChartShapes")
    void acceptsValidShapeForEveryQueryBackedChart(String chartType, int dimensions, int metrics) {
        assertDoesNotThrow(() -> VisQueryPrep.prepare(request(chartType, dimensions, metrics)));
    }

    @ParameterizedTest(name = "{0}: rejects {1} dimensions, {2} metrics")
    @MethodSource("invalidChartShapes")
    void rejectsInvalidShapeForEveryQueryBackedChart(String chartType, int dimensions, int metrics,
                                                     String message) {
        ResultException error = assertThrows(ResultException.class,
                () -> VisQueryPrep.prepare(request(chartType, dimensions, metrics)));

        assertEquals(message, error.getMsg());
    }

    @ParameterizedTest(name = "{0}: rejects additional boundary {1} dimensions, {2} metrics")
    @MethodSource("additionalInvalidBoundaries")
    void rejectsAdditionalCardinalityBoundaries(String chartType, int dimensions, int metrics,
                                                 String message) {
        ResultException error = assertThrows(ResultException.class,
                () -> VisQueryPrep.prepare(request(chartType, dimensions, metrics)));

        assertEquals(message, error.getMsg());
    }

    @Test
    void rejectsMultipleDimensionsForMultiMetricBarAndLine() {
        for (String chartType : List.of("bar", "line")) {
            ResultException error = assertThrows(ResultException.class,
                    () -> VisQueryPrep.prepare(request(chartType, 2, 2)));
            assertEquals(chartType.equals("bar")
                    ? "柱状图在多个指标时只能使用 1 个维度"
                    : "折线图在多个指标时只能使用 1 个维度", error.getMsg());
        }
    }

    @Test
    void rejectsContrastForChartsThatDoNotSupportIt() {
        QueryRequest request = request("bar", 1, 0);
        request.getQuery().setMetrics(List.of(contrastMetric("amount", "amount_vs")));

        ResultException error = assertThrows(ResultException.class, () -> VisQueryPrep.prepare(request));

        assertEquals("柱状图不支持同比 / 环比", error.getMsg());
    }

    @Test
    void numberAcceptsOnlyContrastMetrics() {
        QueryRequest request = request("number", 0, 0);
        request.getQuery().setMetrics(List.of(contrastMetric("amount", "amount_vs")));

        assertDoesNotThrow(() -> VisQueryPrep.prepare(request));

        MetricItem difference = contrastMetric("amount", "amount_diff");
        difference.getContrast().setCalcType("diff");
        request.getQuery().setMetrics(List.of(difference, contrastMetric("amount", "amount_vs")));

        assertDoesNotThrow(() -> VisQueryPrep.prepare(request));
    }

    @Test
    void numberAcceptsContrastBeforeRegularMetric() {
        QueryRequest request = request("number", 0, 1);
        request.getQuery().getMetrics().addFirst(contrastMetric("amount", "amount_vs"));

        assertDoesNotThrow(() -> VisQueryPrep.prepare(request));
        assertEquals("amount_vs", request.getQuery().getMetrics().getFirst().getLabel());
    }

    @Test
    void tableAndNumberAcceptCompleteContrastMetrics() {
        QueryRequest table = request("table", 0, 0);
        table.getQuery().setMetrics(List.of(contrastMetric("amount", "amount_vs")));
        QueryRequest number = request("number", 0, 1);
        number.getQuery().getMetrics().add(contrastMetric("amount", "amount_vs"));

        assertDoesNotThrow(() -> VisQueryPrep.prepare(table));
        assertDoesNotThrow(() -> VisQueryPrep.prepare(number));
    }

    @Test
    void pivotMustUseThePivotEndpoint() {
        ResultException error = assertThrows(ResultException.class,
                () -> VisQueryPrep.prepare(request("pivot", 1, 1)));

        assertEquals("chartType=pivot 请使用透视查询", error.getMsg());
    }

    @Test
    void pivotEndpointAcceptsAValidPivotQuery() {
        assertDoesNotThrow(() -> VisQueryPrep.preparePivot(pivotRequest("pivot", 1, 1, 1)));
    }

    @Test
    void pivotEndpointRejectsANonPivotChartType() {
        ResultException error = assertThrows(ResultException.class,
                () -> VisQueryPrep.preparePivot(pivotRequest("table", 1, 1, 1)));

        assertEquals("透视查询 chartType 必须是 pivot", error.getMsg());
    }

    @Test
    void pivotEndpointRequiresAtLeastOneMetric() {
        ResultException error = assertThrows(ResultException.class,
                () -> VisQueryPrep.preparePivot(pivotRequest("pivot", 1, 1, 0)));

        assertEquals("metrics 不能为空", error.getMsg());
    }

    @ParameterizedTest
    @EnumSource(SqlDialect.class)
    void sortsFormulaResultsAndDimensionsByQuotedDisplayNames(SqlDialect dialect) {
        QueryRequest request = request("table", 1, 1);
        QueryConfig config = request.getQuery();
        config.getDimensions().getFirst().setLabel("  销售 地区  ");
        MetricItem metric = config.getMetrics().getFirst();
        metric.setFormula("SUM(metric_0) / 100");
        metric.setAgg(null);
        metric.setLabel("  销售额 `合计` \"本月\"（元）  ");
        config.setOrderList(List.of(order(" 销售 地区 ", "asc"), order(metric.getLabel(), "desc")));

        VisQueryPrep.prepare(request);

        String quotedRegion = dialect.quote("销售 地区");
        String quotedMetric = dialect.quote("销售额 `合计` \"本月\"（元）");
        String sql = SqlBuilder.build(queryBo(config, dialect)).getSql();
        assertTrue(sql.contains("SUM(metric_0) / 100 AS " + quotedMetric));
        assertTrue(sql.contains(" ORDER BY " + quotedRegion + " ASC, " + quotedMetric + " DESC"));
        assertEquals("销售 地区", config.getDimensions().getFirst().getLabel());
        assertEquals("销售额 `合计` \"本月\"（元）", config.getOrderList().getLast().getField());
    }

    @ParameterizedTest
    @EnumSource(SqlDialect.class)
    void acceptsAndQuotesContrastDisplayNamesWithSpaces(SqlDialect dialect) {
        QueryRequest request = request("number", 0, 0);
        request.getQuery().setMetrics(List.of(contrastMetric("amount", "  销售 同比（%）  ")));
        request.getQuery().setOrderList(List.of(order("销售 同比（%）", "desc")));

        VisQueryPrep.prepare(request);

        String alias = dialect.quote("销售 同比（%）");
        String sql = ContrastSqlAssembler.build(queryBo(request.getQuery(), dialect)).getSqlRet().getSql();
        assertTrue(sql.contains(" AS " + alias));
        assertTrue(sql.contains(" ORDER BY " + alias + " DESC"));
    }

    @Test
    void acceptsPivotSortingByDisplayNamesWithSpaces() {
        PivotQueryRequest request = pivotRequest("pivot", 1, 1, 1);
        var config = request.getQuery();
        config.getRowDimensions().getFirst().setLabel("销售 地区");
        config.getColDimensions().getFirst().setLabel("订单 月份");
        config.getMetrics().getFirst().setLabel("销售 合计");
        config.setOrderList(List.of(order("销售 地区", "asc"), order("销售 合计", "desc")));
        assertDoesNotThrow(() -> VisQueryPrep.preparePivot(request));
    }

    @Test
    void resultFiltersUseTheSameDisplayAliasesAndStillValidateTheirValues() {
        QueryRequest request = request("table", 0, 1);
        request.getQuery().getMetrics().getFirst().setLabel("销售 合计");
        FilterItem filter = new FilterItem();
        filter.setField(" 销售 合计 ");
        filter.setOp("gt");
        filter.setValue(new Object[]{100});
        request.getQuery().setResultFilters(List.of(filter));

        VisQueryPrep.prepare(request);

        var sql = SqlBuilder.build(queryBo(request.getQuery(), SqlDialect.MYSQL));
        assertTrue(sql.getSql().contains("WHERE `销售 合计` > ?"));
        assertEquals(100, sql.getParams()[0]);
        filter.setValue(null);
        assertThrows(ResultException.class, () -> VisQueryPrep.prepare(request));
        filter.setField("未选择的字段");
        assertEquals("resultFilters.field 必须是 SELECT 别名: 未选择的字段",
                assertThrows(ResultException.class, () -> VisQueryPrep.prepare(request)).getMsg());
    }

    @Test
    void rejectsUnknownSortAliasesAndInvalidDirections() {
        QueryRequest request = request("table", 0, 1);
        request.getQuery().getMetrics().getFirst().setLabel("销售 合计");
        OrderItem order = order("metric_0", "asc");
        request.getQuery().setOrderList(List.of(order));
        assertEquals("order.field 必须是 SELECT 别名: metric_0",
                assertThrows(ResultException.class, () -> VisQueryPrep.prepare(request)).getMsg());
        order.setField("销售 合计");
        order.setDir("desc; SELECT 1");
        assertThrows(ResultException.class, () -> VisQueryPrep.prepare(request));
    }

    @Test
    void rejectsDuplicateDisplayNamesAcrossDimensionsAndMetrics() {
        QueryRequest request = request("table", 1, 1);
        request.getQuery().getDimensions().getFirst().setLabel("  销售 合计  ");
        request.getQuery().getMetrics().getFirst().setLabel("销售 合计");
        assertEquals("展示字段名重复，请修改显示名: 销售 合计",
                assertThrows(ResultException.class, () -> VisQueryPrep.prepare(request)).getMsg());
    }

    @ParameterizedTest
    @ValueSource(strings = {"销售\n合计", "销售\t合计", "销售\u0000合计"})
    void rejectsControlCharactersInDisplayNames(String alias) {
        QueryRequest request = request("table", 0, 1);
        request.getQuery().getMetrics().getFirst().setLabel(alias);
        assertEquals("显示名不能包含换行或其他控制字符",
                assertThrows(ResultException.class, () -> VisQueryPrep.prepare(request)).getMsg());
    }

    @Test
    void keepsOriginalFieldValidationSeparateFromDisplayNames() {
        QueryRequest request = request("table", 0, 1);
        request.getQuery().getMetrics().getFirst().setField("amount invalid");
        assertEquals("非法字段名: amount invalid",
                assertThrows(ResultException.class, () -> VisQueryPrep.prepare(request)).getMsg());
    }

    private static OrderItem order(String alias, String direction) {
        OrderItem order = new OrderItem();
        order.setField(alias);
        order.setDir(direction);
        return order;
    }

    private static QueryBO queryBo(QueryConfig config, SqlDialect dialect) {
        QueryBO query = new QueryBO();
        query.setDialect(dialect);
        query.setInnerSql("SELECT region, amount, metric_0, dimension_0, order_date FROM orders");
        query.setDimensions(config.getDimensions());
        query.setMetrics(config.getMetrics());
        query.setOrderList(config.getOrderList());
        query.setResultFilters(config.getResultFilters());
        return query;
    }

    private static Stream<Arguments> validChartShapes() {
        return Stream.of(
                Arguments.of("table", 1, 0),
                Arguments.of("number", 0, 1),
                Arguments.of("progress", 0, 1),
                Arguments.of("kpi", 1, 1),
                Arguments.of("bar", 1, 1),
                Arguments.of("line", 1, 1),
                Arguments.of("combo", 1, 2),
                Arguments.of("pie", 1, 1),
                Arguments.of("funnel", 1, 1),
                Arguments.of("wordcloud", 1, 1),
                Arguments.of("treemap", 1, 1),
                Arguments.of("heatmap", 2, 1),
                Arguments.of("scatter", 0, 2),
                Arguments.of("radar", 1, 1),
                Arguments.of("waterfall", 1, 1),
                Arguments.of("trend", 1, 1),
                Arguments.of("rank", 1, 1)
        );
    }

    private static Stream<Arguments> invalidChartShapes() {
        return Stream.of(
                Arguments.of("table", 0, 0, "dimensions 和 metrics 不能同时为空"),
                Arguments.of("number", 1, 1, "数字卡片不支持维度"),
                Arguments.of("number", 0, 0, "dimensions 和 metrics 不能同时为空"),
                Arguments.of("progress", 1, 1, "进度条不支持维度"),
                Arguments.of("kpi", 0, 1, "KPI图需要恰好 1 个维度"),
                Arguments.of("bar", 0, 1, "柱状图至少需要 1 个维度"),
                Arguments.of("line", 1, 0, "折线图至少需要 1 个指标"),
                Arguments.of("combo", 1, 1, "组合图至少需要 2 个指标"),
                Arguments.of("pie", 1, 2, "饼图需要恰好 1 个指标"),
                Arguments.of("funnel", 0, 1, "漏斗图需要恰好 1 个维度"),
                Arguments.of("wordcloud", 1, 2, "词云需要恰好 1 个指标"),
                Arguments.of("treemap", 4, 1, "矩形树图需要 1 到 3 个维度"),
                Arguments.of("heatmap", 1, 1, "热力图需要恰好 2 个维度"),
                Arguments.of("scatter", 2, 2, "散点图最多 1 个维度"),
                Arguments.of("radar", 1, 0, "雷达图至少需要 1 个指标"),
                Arguments.of("waterfall", 1, 2, "瀑布图需要恰好 1 个指标"),
                Arguments.of("trend", 0, 1, "趋势指标卡需要恰好 1 个维度"),
                Arguments.of("rank", 2, 1, "排行榜需要恰好 1 个维度")
        );
    }

    private static Stream<Arguments> additionalInvalidBoundaries() {
        return Stream.of(
                Arguments.of("bar", 1, 0, "柱状图至少需要 1 个指标"),
                Arguments.of("line", 0, 1, "折线图至少需要 1 个维度"),
                Arguments.of("progress", 0, 3, "进度条最多 2 个指标"),
                Arguments.of("kpi", 2, 1, "KPI图需要恰好 1 个维度"),
                Arguments.of("kpi", 1, 3, "KPI图最多 2 个指标"),
                Arguments.of("combo", 2, 2, "组合图需要恰好 1 个维度"),
                Arguments.of("pie", 0, 1, "饼图需要恰好 1 个维度"),
                Arguments.of("funnel", 1, 2, "漏斗图需要恰好 1 个指标"),
                Arguments.of("wordcloud", 0, 1, "词云需要恰好 1 个维度"),
                Arguments.of("treemap", 1, 2, "矩形树图需要恰好 1 个指标"),
                Arguments.of("heatmap", 2, 2, "热力图需要恰好 1 个指标"),
                Arguments.of("scatter", 0, 3, "散点图需要恰好 2 个指标"),
                Arguments.of("radar", 2, 1, "雷达图需要恰好 1 个维度"),
                Arguments.of("waterfall", 0, 1, "瀑布图需要恰好 1 个维度"),
                Arguments.of("trend", 1, 0, "趋势指标卡至少需要 1 个指标"),
                Arguments.of("rank", 1, 2, "排行榜需要恰好 1 个指标")
        );
    }

    private static QueryRequest request(String chartType, int dimensionCount, int metricCount) {
        QueryConfig config = new QueryConfig();
        config.setDatasetId(1L);
        config.setDimensions(dimensions(dimensionCount));
        config.setMetrics(metrics(metricCount));
        QueryRequest request = new QueryRequest();
        request.setQuery(config);
        request.setVisual(Map.of("chartType", chartType));
        return request;
    }

    private static PivotQueryRequest pivotRequest(String chartType, int rowDimensionCount,
                                                  int colDimensionCount, int metricCount) {
        PivotQueryConfig config = new PivotQueryConfig();
        config.setDatasetId(1L);
        config.setRowDimensions(dimensions(rowDimensionCount, "row_dimension_"));
        config.setColDimensions(dimensions(colDimensionCount, "col_dimension_"));
        config.setMetrics(metrics(metricCount));
        PivotQueryRequest request = new PivotQueryRequest();
        request.setQuery(config);
        request.setVisual(Map.of("chartType", chartType));
        return request;
    }

    private static List<DimensionItem> dimensions(int count) {
        return dimensions(count, "dimension_");
    }

    private static List<DimensionItem> dimensions(int count, String prefix) {
        List<DimensionItem> dimensions = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            DimensionItem item = new DimensionItem();
            item.setField(prefix + i);
            dimensions.add(item);
        }
        return dimensions;
    }

    private static List<MetricItem> metrics(int count) {
        List<MetricItem> metrics = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            MetricItem item = new MetricItem();
            item.setField("metric_" + i);
            item.setAgg("SUM");
            metrics.add(item);
        }
        return metrics;
    }

    private static MetricItem contrastMetric(String field, String label) {
        ContrastConfig contrast = new ContrastConfig();
        contrast.setTimeField("order_date");
        contrast.setCalcMethod("shift_day");
        contrast.setCalcType("diffRate");
        contrast.setValueExp("current_day");
        MetricItem metric = new MetricItem();
        metric.setField(field);
        metric.setLabel(label);
        metric.setAgg("SUM");
        metric.setContrast(contrast);
        return metric;
    }
}
