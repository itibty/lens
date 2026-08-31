package com.codet.lens.vis.core.query;

import com.codet.lens.common.ResultException;
import com.codet.lens.vis.dto.item.HavingFilterItem;
import com.codet.lens.vis.dto.item.MetricItem;
import com.codet.lens.vis.dto.pivot.PivotQueryConfig;
import com.codet.lens.vis.dto.pivot.PivotQueryRequest;
import com.codet.lens.vis.dto.query.QueryConfig;
import com.codet.lens.vis.dto.query.QueryRequest;
import com.codet.lens.vis.rds.dto.conf.ConfSqlFieldInfo;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class VisCatalogCheckTest {

    @Test
    void rejectsHavingOnMissingSourceField() {
        ResultException error = assertThrows(ResultException.class,
                () -> VisCatalogCheck.check(List.of(field("region", "STRING")), "销售", query(having("amount", "SUM", null))));

        assertEquals("图表无法查询：字段 amount 已不在数据集中。请联系配置人", error.getMsg());
    }

    @Test
    void rejectsHavingSumOnNonNumberField() {
        ResultException error = assertThrows(ResultException.class,
                () -> VisCatalogCheck.check(List.of(field("region", "STRING")), "销售", query(having("region", "SUM", null))));

        assertEquals("图表无法查询：region 不是数值字段，不能求和/平均。请联系配置人", error.getMsg());
    }

    @Test
    void skipsFormulaHaving() {
        assertDoesNotThrow(() -> VisCatalogCheck.check(
                List.of(field("region", "STRING")),
                "销售",
                query(having("missing_col", null, "SUM(amount) / COUNT(1)"))));
    }

    @Test
    void skipsFormulaMetricAlias() {
        MetricItem metric = new MetricItem();
        metric.setField("利润率");
        metric.setFormula("SUM(profit) / SUM(revenue) * 100");
        metric.setLabel("利润率");
        QueryConfig config = new QueryConfig();
        config.setMetrics(List.of(metric));
        QueryRequest request = new QueryRequest();
        request.setQuery(config);

        assertDoesNotThrow(() -> VisCatalogCheck.check(
                List.of(field("profit", "NUMBER"), field("revenue", "NUMBER")),
                "销售",
                request));
    }

    @Test
    void acceptsHavingOnCatalogField() {
        assertDoesNotThrow(() -> VisCatalogCheck.check(
                List.of(field("amount", "NUMBER")),
                "销售",
                query(having("amount", "SUM", null))));
    }

    @Test
    void checksPivotHavingSourceField() {
        PivotQueryConfig config = new PivotQueryConfig();
        config.setHavingFilters(List.of(having("amount", "SUM", null)));
        PivotQueryRequest request = new PivotQueryRequest();
        request.setQuery(config);

        ResultException error = assertThrows(ResultException.class,
                () -> VisCatalogCheck.check(List.of(field("region", "STRING")), "销售", request));

        assertEquals("图表无法查询：字段 amount 已不在数据集中。请联系配置人", error.getMsg());
    }

    private static QueryRequest query(HavingFilterItem having) {
        QueryConfig config = new QueryConfig();
        config.setHavingFilters(List.of(having));
        QueryRequest request = new QueryRequest();
        request.setQuery(config);
        return request;
    }

    private static HavingFilterItem having(String field, String agg, String formula) {
        HavingFilterItem item = new HavingFilterItem();
        item.setField(field);
        item.setAgg(agg);
        item.setFormula(formula);
        return item;
    }

    private static ConfSqlFieldInfo field(String name, String dataType) {
        ConfSqlFieldInfo field = new ConfSqlFieldInfo();
        field.setField(name);
        field.setDataType(dataType);
        return field;
    }
}
