package com.codet.lens.vis.service;

import com.codet.lens.vis.core.query.QueryBO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VisDataServiceLimitTest {

    @Test
    void systemCapAddsOneProbeRowToGeneratedSql() {
        QueryBO query = new QueryBO();

        VisDataService.configureResultLimit(query, 5000);

        assertEquals(5001, query.getLimit());
        assertEquals(5001, query.getMaxLimit());
    }

    @Test
    void explicitSmallerLimitIsPreserved() {
        QueryBO query = new QueryBO();

        VisDataService.configureResultLimit(query, 100);

        assertEquals(100, query.getLimit());
        assertEquals(5001, query.getMaxLimit());
    }
}
