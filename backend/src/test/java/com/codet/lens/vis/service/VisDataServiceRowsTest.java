package com.codet.lens.vis.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VisDataServiceRowsTest {

    @Test
    void removesAggregateRowsWhoseValuesAreAllNull() {
        Map<String, Object> allNull = new LinkedHashMap<>();
        allNull.put("sales", null);
        allNull.put("profit", null);

        List<Map<String, Object>> rows = VisDataService.normalizeCardRows(List.of(
                Map.of(),
                allNull,
                Map.of("count", 0),
                Map.of("label", "")
        ), true);

        assertEquals(List.of(Map.of("count", 0), Map.of("label", "")), rows);
    }

    @Test
    void keepsAllNullRowsInGroupedResults() {
        Map<String, Object> allNull = new LinkedHashMap<>();
        allNull.put("region", null);
        allNull.put("sales", null);

        assertEquals(List.of(allNull), VisDataService.normalizeCardRows(List.of(allNull), false));
    }
}
