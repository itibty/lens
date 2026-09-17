package com.codet.lens.vis.core.query;

import com.codet.lens.common.base.Status;
import com.codet.lens.vis.dto.item.ContrastConfig;
import com.codet.lens.vis.dto.item.DimensionItem;
import com.codet.lens.vis.dto.item.MetricItem;
import com.codet.lens.vis.dto.dataset.DataTimeConfig;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.enums.TimeGrainEnum;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import com.codet.lens.vis.service.DatasetDataTimeService;
import com.codet.lens.vis.entity.VisDataset;
import com.codet.lens.vis.service.DatasourceMetaService;
import com.zaxxer.hikari.HikariDataSource;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** 只读集成测试；凭据通过环境变量传入，不创建或修改远端表。 */
@EnabledIfEnvironmentVariable(named = "LENS_STARROCKS_URL", matches = ".+")
class StarRocksDatasourceTest {
    private static HikariDataSource pool;
    private static VisDatasource source;
    private static DatasourceRegistry registry;
    private static final String SAMPLE = "SELECT CAST('2026-09-17' AS DATETIME) AS created_at, "
            + "CAST(NULL AS VARCHAR) AS region, 15 AS amount UNION ALL "
            + "SELECT CAST('2026-09-16' AS DATETIME), CAST(NULL AS VARCHAR), 10";

    @BeforeAll static void connect() {
        source = new VisDatasource().setSourceName("starrocks-test").setDbType("STARROCKS")
                .setJdbcUrl(System.getenv("LENS_STARROCKS_URL"))
                .setUsername(System.getenv("LENS_STARROCKS_USER"))
                .setPassword(System.getenv("LENS_STARROCKS_PASSWORD")).setStatus(Status.EBL);
        pool = new DatasourceConnectionFactory().open(source);
        registry = mock(DatasourceRegistry.class);
        when(registry.raw(source.getSourceName())).thenReturn(pool);
        when(registry.exists(source.getSourceName())).thenReturn(true);
        when(registry.template(source.getSourceName())).thenReturn(new JdbcTemplate(pool));
    }

    @AfterAll static void close() {
        if (pool != null) pool.close();
    }

    @Test void readsScopedTablesAndColumns() throws Exception {
        var mapper = mock(VisDatasourceMapper.class);
        when(mapper.selectList(null)).thenReturn(List.of(source));
        var service = new DatasourceMetaService(mapper, registry);
        var tables = service.listTables(source.getSourceName());
        assertFalse(tables.isEmpty());
        try (var connection = pool.getConnection()) {
            String scope = connection.getCatalog() + "." + connection.getSchema();
            assertTrue(tables.stream().allMatch(table -> table.value().startsWith(scope + ".")));
            var tree = service.getMetaTree(source.getSourceName(), tables.getFirst().value());
            assertEquals(scope, tree.getFirst().getName());
            assertEquals(1, tree.getFirst().getTableInfos().size());
            assertFalse(tree.getFirst().getTableInfos().getFirst().getFieldInfos().isEmpty());
            // 触达真实表的读取链路，只返回常量且最多一行，不输出业务字段。
            String table = tree.getFirst().getTableInfos().getFirst().getName();
            String qualified = SqlDialect.STARROCKS.quote(connection.getCatalog()) + "."
                    + SqlDialect.STARROCKS.quote(connection.getSchema()) + "." + SqlDialect.STARROCKS.quote(table);
            assertTrue(select("SELECT 1 AS probe FROM " + qualified + " LIMIT 1").size() <= 1);
        }
    }

    @Test void generatedTimeGrainsUseConsistentCalendarBoundaries() {
        for (TimeGrainEnum grain : TimeGrainEnum.values()) {
            var rows = select("SELECT " + SqlDialect.STARROCKS.timeGrain("CAST(? AS DATETIME)", grain) + " AS value",
                    "2026-09-20 12:30:00");
            String expected = switch (grain) {
                case DAY -> "2026-09-20";
                case WEEK -> "2026-09-14";
                case MONTH -> "2026-09";
                case YEAR -> "2026";
            };
            assertEquals(expected, rows.getFirst().get("value"));
        }
    }

    @Test void executesGeneratedAggregationAndNullSafeContrast() {
        var dimension = new DimensionItem();
        dimension.setField("region"); dimension.setLabel("region");
        var metric = new MetricItem();
        metric.setField("amount"); metric.setAgg("SUM"); metric.setLabel("total");
        var query = new QueryBO();
        query.setDialect(SqlDialect.STARROCKS); query.setInnerSql(SAMPLE);
        query.setDimensions(List.of(dimension)); query.setMetrics(List.of(metric)); query.setLimit(10);
        var built = SqlBuilder.build(query);
        assertEquals(25, ((Number) select(built.getSql(), built.getParams()).getFirst().get("total")).intValue());

        var contrast = new ContrastConfig();
        contrast.setTimeField("created_at"); contrast.setCalcMethod("shift_day");
        contrast.setCalcType("diff"); contrast.setValueExp("current_day");
        metric.setContrast(contrast);
        built = ContrastSqlAssembler.build(query, LocalDate.of(2026, 9, 17)).getSqlRet();
        assertEquals(5, ((Number) select(built.getSql(), built.getParams()).getFirst().get("total")).intValue());
    }

    @Test void bindsFiltersPaginatesAndPreservesDecimalValues() {
        String sql = "SELECT amount FROM (" + SAMPLE + ") t WHERE "
                + SqlDialect.STARROCKS.stringExpr("amount") + " LIKE ? ORDER BY amount";
        assertEquals(2, select(sql, "1%").size());
        assertEquals(15, ((Number) select(SqlDialect.STARROCKS.paginate(sql, 1, 1), "1%")
                .getFirst().get("amount")).intValue());
        assertEquals(new BigDecimal("12345678901234567890.12"), select(
                "SELECT CAST('12345678901234567890.12' AS DECIMAL(30,2)) AS value").getFirst().get("value"));
        assertNotNull(select("SELECT MAX(created_at) AS updated_at FROM (" + SAMPLE + ") t")
                .getFirst().get("updated_at"));
    }

    @Test void cancelsSlowQueryAndKeepsConnectionUsable() throws Exception {
        try (var connection = pool.getConnection(); var statement = connection.createStatement()) {
            // 与正式连接一致：服务端和 JDBC 超时同时设置。
            statement.execute("SET query_timeout = 1");
            statement.setQueryTimeout(1);
            long started = System.nanoTime();
            try {
                var error = assertThrows(SQLException.class, () -> {
                    try (var ignored = statement.executeQuery("SELECT SLEEP(5)")) {}
                });
                assertTrue(error.getMessage().toLowerCase().contains("timeout"), error.getMessage());
                assertTrue((System.nanoTime() - started) / 1_000_000 < 4500);
            } finally {
                statement.execute("SET query_timeout = " + DatasourceConnectionFactory.QUERY_TIMEOUT_SECONDS);
            }
            statement.setQueryTimeout(5);
            try (var rs = statement.executeQuery("SELECT 1")) {
                assertTrue(rs.next()); assertEquals(1, rs.getInt(1));
            }
        }
    }

    @Test void readsDataTimeThroughApplicationService() {
        var sources = mock(VisDatasourceMapper.class);
        var datasets = mock(VisDatasetMapper.class);
        when(sources.selectById(1L)).thenReturn(source);
        when(datasets.selectById(1L)).thenReturn(new VisDataset().setSourceId(1L).setStatus(Status.EBL));
        var service = new DatasetDataTimeService(datasets, sources, registry);
        var config = new DataTimeConfig();
        config.setEnabled(true);
        config.setSql("SELECT MAX(created_at) FROM (" + SAMPLE + ") t");
        assertEquals("ok", service.test(1L, config).getStatus());
    }

    private static List<Map<String, Object>> select(String sql, Object... params) {
        new RdsUtil(registry).bind();
        return RdsUtil.selectList(new SqlTplRet(null, source.getSourceName(), sql, params));
    }
}
