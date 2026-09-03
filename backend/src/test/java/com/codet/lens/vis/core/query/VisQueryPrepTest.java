package com.codet.lens.vis.core.query;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.item.ContrastConfig;
import com.codet.lens.vis.dto.item.DimensionItem;
import com.codet.lens.vis.dto.item.MetricItem;
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

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class VisQueryPrepTest {

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
    void numberRequiresARegularMetric() {
        QueryRequest request = request("number", 0, 0);
        request.getQuery().setMetrics(List.of(contrastMetric("amount", "amount_vs")));

        ResultException error = assertThrows(ResultException.class, () -> VisQueryPrep.prepare(request));

        assertEquals("数字卡片至少需要 1 个主指标", error.getMsg());
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
                Arguments.of("tornado", 1, 2),
                Arguments.of("rank", 1, 1)
        );
    }

    private static Stream<Arguments> invalidChartShapes() {
        return Stream.of(
                Arguments.of("table", 0, 0, "dimensions 和 metrics 不能同时为空"),
                Arguments.of("number", 1, 1, "数字卡片不支持维度"),
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
                Arguments.of("tornado", 1, 1, "对比条需要恰好 2 个指标"),
                Arguments.of("rank", 2, 1, "排行榜需要恰好 1 个维度")
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

    private static List<DimensionItem> dimensions(int count) {
        List<DimensionItem> dimensions = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            DimensionItem item = new DimensionItem();
            item.setField("dimension_" + i);
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
