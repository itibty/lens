package com.codet.lens.vis.core.pivot;

import com.codet.lens.vis.dto.pivot.PivotColumn;
import com.codet.lens.vis.dto.pivot.PivotRow;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PivotResultAssemblerTest {

    @Test
    void keepsEncounterOrderWhenFollowingSql() {
        PivotResultAssembler.Result result = PivotResultAssembler.toResult(
                sampleRows(), List.of("地区", "品类"), List.of(), List.of("销售额"), true);

        assertEquals(List.of(
                List.of("西区", "零食"),
                List.of("西区", "水果"),
                List.of("东区", "零食")
        ), paths(result.rows));
    }

    @Test
    void fallsBackToPathOrderWhenNoSqlOrder() {
        PivotResultAssembler.Result result = PivotResultAssembler.toResult(
                sampleRows(), List.of("地区", "品类"), List.of(), List.of("销售额"), false);

        assertEquals(List.of(
                List.of("东区", "零食"),
                List.of("西区", "水果"),
                List.of("西区", "零食")
        ), paths(result.rows));
    }

    @Test
    void keepsColumnEncounterOrderWhenFollowingSql() {
        List<Map<String, Object>> rows = List.of(
                yearCell("西区", "2025", 80),
                yearCell("东区", "2024", 60)
        );
        PivotResultAssembler.Result result = PivotResultAssembler.toResult(
                rows, List.of("地区"), List.of("年份"), List.of("销售额"), true);

        assertEquals(List.of(List.of("2025"), List.of("2024")), colPaths(result.columns));
        assertEquals(List.of(List.of("西区"), List.of("东区")), paths(result.rows));
    }

    @Test
    void leavesSubtotalsWhereTheyWereMetWhenFollowingSql() {
        List<Map<String, Object>> rows = new ArrayList<>(sampleRows());
        rows.add(subtotal("东区", 80));
        rows.add(subtotal("西区", 250));

        PivotResultAssembler.Result result = PivotResultAssembler.toResult(
                rows, List.of("地区", "品类"), List.of(), List.of("销售额"), true);

        assertEquals(List.of(
                List.of("西区", "零食"),
                List.of("西区", "水果"),
                List.of("东区", "零食"),
                List.of("东区"),
                List.of("西区")
        ), paths(result.rows));
    }

    private static List<Map<String, Object>> sampleRows() {
        return List.of(
                cell("西区", "零食", 50),
                cell("西区", "水果", 200),
                cell("东区", "零食", 80)
        );
    }

    private static Map<String, Object> cell(String region, String category, Object sales) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("地区", region);
        row.put("品类", category);
        row.put("销售额", sales);
        return row;
    }

    private static Map<String, Object> yearCell(String region, String year, Object sales) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("地区", region);
        row.put("年份", year);
        row.put("销售额", sales);
        return row;
    }

    private static Map<String, Object> subtotal(String region, Object sales) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("地区", region);
        row.put("销售额", sales);
        return row;
    }

    private static List<List<Object>> paths(List<PivotRow> rows) {
        return rows.stream().map(PivotRow::getPath).toList();
    }

    private static List<List<Object>> colPaths(List<PivotColumn> columns) {
        return columns.stream().map(PivotColumn::getPath).toList();
    }
}
