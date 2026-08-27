package com.codet.lens.vis.service;

import com.codet.lens.vis.rds.bo.SqlTplRet;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

class VisFilterOptionsServiceTest {

    @Test
    void appliesPostgresValueFilterWithVarcharCast() {
        SqlTplRet source = new SqlTplRet(1L, "pg", "SELECT code FROM items;", new Object[]{7});

        SqlTplRet filtered = VisFilterOptionsService.applyValueFilter(
                source, "POSTGRES", "code", List.of("A", "B"));

        assertEquals(
                "SELECT * FROM (SELECT code FROM items) __fo "
                        + "WHERE CAST(__fo.\"code\" AS VARCHAR) IN (?, ?)",
                filtered.getSql());
        assertArrayEquals(new Object[]{7, "A", "B"}, filtered.getParams());
    }

    @Test
    void appliesLimitThroughDatasourceDialect() {
        SqlTplRet source = new SqlTplRet(1L, "pg", "SELECT code FROM items;", new Object[]{7});

        SqlTplRet limited = VisFilterOptionsService.applyLimit(source, "POSTGRES", 51);

        assertEquals(
                "select * from (SELECT * FROM (SELECT code FROM items) __fo) __page LIMIT 51 OFFSET 0",
                limited.getSql());
        assertArrayEquals(new Object[]{7}, limited.getParams());
    }
}
