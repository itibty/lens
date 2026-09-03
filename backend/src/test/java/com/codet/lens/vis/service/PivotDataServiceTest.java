package com.codet.lens.vis.service;

import com.codet.lens.vis.core.query.QueryBO;
import com.codet.lens.vis.dto.item.HavingFilterItem;
import com.codet.lens.vis.dto.item.OrderItem;
import com.codet.lens.vis.dto.pivot.PivotQueryConfig;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PivotDataServiceTest {

    @Test
    void detailGrainKeepsHavingOrderAndLimit() {
        QueryBO bo = new QueryBO();
        PivotDataService.applyDetailDisplayControls(bo, true, config(), 20000);

        assertEquals(1, bo.getHavingFilters().size());
        assertEquals("amount", bo.getHavingFilters().get(0).getField());
        assertEquals("sales", bo.getOrderList().get(0).getField());
        assertEquals(500, bo.getLimit());
        assertEquals(PivotDataService.MAX_LIMIT + 1, bo.getMaxLimit());
        assertFalse(bo.isSkipLimit());
    }

    @Test
    void detailGrainUsesDefaultLimitWhenUnset() {
        PivotQueryConfig config = config();
        config.setLimit(null);
        QueryBO bo = new QueryBO();
        PivotDataService.applyDetailDisplayControls(bo, true, config, 20000);

        assertEquals(20001, bo.getLimit());
        assertEquals(PivotDataService.MAX_LIMIT + 1, bo.getMaxLimit());
    }

    @Test
    void subtotalGrainSkipsHavingOrderAndLimit() {
        QueryBO bo = new QueryBO();
        PivotDataService.applyDetailDisplayControls(bo, false, config(), 20000);

        assertNull(bo.getHavingFilters());
        assertNull(bo.getOrderList());
        assertNull(bo.getLimit());
        assertTrue(bo.isSkipLimit());
    }

    private static PivotQueryConfig config() {
        HavingFilterItem having = new HavingFilterItem();
        having.setField("amount");
        having.setAgg("SUM");
        having.setOp("gt");
        having.setValue(new Object[]{1000});
        OrderItem order = new OrderItem();
        order.setField("sales");
        order.setDir("desc");
        PivotQueryConfig config = new PivotQueryConfig();
        config.setHavingFilters(List.of(having));
        config.setOrderList(List.of(order));
        config.setLimit(500);
        return config;
    }
}
