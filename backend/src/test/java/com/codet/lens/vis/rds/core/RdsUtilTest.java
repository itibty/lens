package com.codet.lens.vis.rds.core;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RdsUtilTest {

    @Test
    void acceptsUniqueColumnLabels() {
        assertDoesNotThrow(() -> RdsUtil.requireUniqueColumnLabels(List.of("order_id", "customer_id")));
    }

    @Test
    void rejectsDuplicateColumnLabelsIgnoringCase() {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> RdsUtil.requireUniqueColumnLabels(List.of("id", "name", "ID")));

        assertEquals("查询结果存在重复列名：ID。Lens 要求输出列名唯一，请使用 AS 设置唯一别名，"
                + "例如 a.id AS order_id、b.id AS customer_id", error.getMessage());
    }
}
