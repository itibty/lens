package com.codet.lens.vis.core.query;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

class SqlExprHelperTest {

    @Test
    void eqDateOnlyCoversWholeDay() {
        Condition got = condition("eq", "2024-01-01");
        assertEquals("(`order_date` >= ? AND `order_date` < ?)", got.sql);
        assertEquals(Timestamp.valueOf("2024-01-01 00:00:00"), got.params.get(0));
        assertEquals(Timestamp.valueOf("2024-01-02 00:00:00"), got.params.get(1));
    }

    @Test
    void lteDateOnlyIncludesWholeDay() {
        Condition got = condition("lte", "2024-01-01");
        assertEquals("(`order_date` < ?)", got.sql);
        assertEquals(Timestamp.valueOf("2024-01-02 00:00:00"), got.params.get(0));
    }

    @Test
    void gteDateOnlyStartsAtDayBegin() {
        Condition got = condition("gte", "2024-01-01");
        assertEquals("(`order_date` >= ?)", got.sql);
        assertEquals(Timestamp.valueOf("2024-01-01 00:00:00"), got.params.get(0));
    }

    @Test
    void gtDateOnlyStartsNextDay() {
        Condition got = condition("gt", "2024-01-01");
        assertEquals("(`order_date` >= ?)", got.sql);
        assertEquals(Timestamp.valueOf("2024-01-02 00:00:00"), got.params.get(0));
    }

    @Test
    void ltDateOnlyStopsAtDayBegin() {
        Condition got = condition("lt", "2024-01-01");
        assertEquals("(`order_date` < ?)", got.sql);
        assertEquals(Timestamp.valueOf("2024-01-01 00:00:00"), got.params.get(0));
    }

    @Test
    void neDateOnlyExcludesWholeDay() {
        Condition got = condition("ne", "2024-01-01");
        assertEquals("(`order_date` < ? OR `order_date` >= ?)", got.sql);
        assertEquals(Timestamp.valueOf("2024-01-01 00:00:00"), got.params.get(0));
        assertEquals(Timestamp.valueOf("2024-01-02 00:00:00"), got.params.get(1));
    }

    @Test
    void datetimeLiteralStaysExactCompare() {
        Condition got = condition("eq", "2024-01-01 12:00:00");
        assertEquals("`order_date` = ?", got.sql);
        assertEquals("2024-01-01 12:00:00", got.params.get(0));
        assertInstanceOf(String.class, got.params.get(0));
    }

    @Test
    void invalidDateLiteralStaysExactCompare() {
        Condition got = condition("eq", "2024-13-40");
        assertEquals("`order_date` = ?", got.sql);
        assertEquals("2024-13-40", got.params.get(0));
    }

    private static Condition condition(String op, Object value) {
        StringBuilder clause = new StringBuilder();
        List<Object> params = new ArrayList<>();
        SqlExprHelper.buildConditionExpr("`order_date`", op, new Object[]{value}, clause, params);
        return new Condition(clause.toString(), params);
    }

    private record Condition(String sql, List<Object> params) {
    }
}
