package com.codet.lens.vis.core.query;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.item.ContrastConfig;
import com.codet.lens.vis.dto.item.DimensionItem;
import com.codet.lens.vis.dto.item.MetricItem;
import com.codet.lens.vis.enums.TimeGrainEnum;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SqlDialectTest {

    @Test
    void resolvesOnlySupportedDatasourceTypes() {
        assertEquals(SqlDialect.MYSQL, SqlDialect.of("mysql"));
        assertEquals(SqlDialect.POSTGRES, SqlDialect.of("postgresql"));

        ResultException error = assertThrows(ResultException.class, () -> SqlDialect.of("ORACLE"));
        assertEquals("暂不支持的数据源类型：ORACLE，当前仅支持 MYSQL、POSTGRES", error.getMsg());
    }

    @Test
    void generatesDatabaseSpecificTimeGrains() {
        assertEquals("DATE_FORMAT(`created_at`, '%Y-%m')",
                SqlDialect.MYSQL.timeGrain("`created_at`", TimeGrainEnum.MONTH));
        assertEquals("TO_CHAR(DATE_TRUNC('week', \"created_at\"), 'YYYY-MM-DD')",
                SqlDialect.POSTGRES.timeGrain("\"created_at\"", TimeGrainEnum.WEEK));
    }

    @Test
    void buildsPostgresQueryWithPostgresTimeGrain() {
        QueryBO query = new QueryBO();
        query.setDialect(SqlDialect.POSTGRES);
        query.setInnerSql("SELECT created_at FROM orders");
        query.setDimensions(List.of(dimension("created_at", "week", "week")));
        query.setLimit(25);

        String sql = SqlBuilder.build(query).getSql();

        assertTrue(sql.contains("TO_CHAR(DATE_TRUNC('week', \"created_at\"), 'YYYY-MM-DD')"));
        assertTrue(sql.endsWith(" LIMIT 25"));
    }

    @Test
    void usesDialectSpecificNullSafeEqualityInContrastQuery() {
        QueryBO postgres = contrastQuery(SqlDialect.POSTGRES);
        QueryBO mysql = contrastQuery(SqlDialect.MYSQL);

        String postgresSql = ContrastSqlAssembler.build(postgres, LocalDate.of(2026, 8, 27))
                .getSqlRet().getSql();
        String mysqlSql = ContrastSqlAssembler.build(mysql, LocalDate.of(2026, 8, 27))
                .getSqlRet().getSql();

        assertTrue(postgresSql.contains("m.\"region\" IS NOT DISTINCT FROM c0.\"region\""));
        assertTrue(mysqlSql.contains("m.`region` <=> c0.`region`"));
    }

    @Test
    void generatesPaginationAndStringCastByDialect() {
        assertEquals("SELECT 1 LIMIT 10 OFFSET 20",
                SqlDialect.POSTGRES.paginate("SELECT 1", 20, 10));
        assertEquals("CAST(\"code\" AS VARCHAR)",
                SqlDialect.POSTGRES.stringExpr("\"code\""));
        assertEquals("CAST(`code` AS CHAR)",
                SqlDialect.MYSQL.stringExpr("`code`"));
    }

    @Test
    void bindsDateRangesAsJdbcTimestampsForPostgresCompatibility() {
        List<Object> params = new ArrayList<>();
        StringBuilder clause = new StringBuilder();

        SqlExprHelper.appendDateRangeHalfOpen(
                "\"created_at\"", "2026-08-01", "2026-08-27", clause, params);

        assertEquals("(\"created_at\" >= ? AND \"created_at\" < ?)", clause.toString());
        assertInstanceOf(Timestamp.class, params.get(0));
        assertEquals(Timestamp.valueOf("2026-08-28 00:00:00"), params.get(1));
    }

    private static QueryBO contrastQuery(SqlDialect dialect) {
        ContrastConfig contrast = new ContrastConfig();
        contrast.setTimeField("created_at");
        contrast.setCalcMethod("shift_day");
        contrast.setCalcType("diff");
        contrast.setValueExp("current_day");

        MetricItem metric = new MetricItem();
        metric.setField("amount");
        metric.setLabel("revenue_diff");
        metric.setAgg("SUM");
        metric.setContrast(contrast);

        QueryBO query = new QueryBO();
        query.setDialect(dialect);
        query.setInnerSql("SELECT region, created_at, amount FROM orders");
        query.setDimensions(List.of(dimension("region", null, "region")));
        query.setMetrics(List.of(metric));
        query.setLimit(10);
        return query;
    }

    private static DimensionItem dimension(String field, String grain, String label) {
        DimensionItem dimension = new DimensionItem();
        dimension.setField(field);
        dimension.setTimeGrain(grain);
        dimension.setLabel(label);
        return dimension;
    }
}
