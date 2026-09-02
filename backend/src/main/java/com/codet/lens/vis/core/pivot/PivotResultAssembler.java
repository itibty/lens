package com.codet.lens.vis.core.pivot;

import cn.hutool.core.collection.CollUtil;
import com.codet.lens.vis.dto.pivot.PivotColumn;
import com.codet.lens.vis.dto.pivot.PivotRow;
import java.util.*;

/**
 * 透视长表 → 带 path/role 的结构化结果。列 id 供行 values 引用。
 * 有 orderList 时保持长表遇见顺序（明细 SQL 的 ORDER BY）；未指定时再按维值正序兜底。
 */
public final class PivotResultAssembler {

    public static final String ROLE_DETAIL = "detail";
    public static final String ROLE_SUBTOTAL = "subtotal";
    public static final String ROLE_TOTAL = "total";
    public static final int MAX_COLUMN_VALUES = 50;

    private PivotResultAssembler() {
    }

    public static Result toResult(List<Map<String, Object>> longRows,
                                  List<String> rowFields,
                                  List<String> colFields,
                                  List<String> metrics,
                                  boolean followEncounterOrder) {
        List<String> rows = new ArrayList<>(CollUtil.emptyIfNull(rowFields));
        List<String> cols = new ArrayList<>(CollUtil.emptyIfNull(colFields));
        List<String> metricAliases = new ArrayList<>(CollUtil.emptyIfNull(metrics));

        LinkedHashMap<List<Object>, Integer> colOrder = new LinkedHashMap<>();
        boolean columnTruncated = false;
        Map<List<Object>, Map<List<Object>, Map<String, Object>>> byRow = new LinkedHashMap<>();

        for (Map<String, Object> longRow : CollUtil.emptyIfNull(longRows)) {
            List<Object> colPath = extractPath(longRow, cols);
            if (!colOrder.containsKey(colPath)) {
                if (colOrder.size() >= MAX_COLUMN_VALUES) {
                    columnTruncated = true;
                    continue;
                }
                colOrder.put(colPath, colOrder.size());
            }
            List<Object> rowPath = extractPath(longRow, rows);
            Map<String, Object> cells = new LinkedHashMap<>();
            for (String metric : metricAliases) {
                cells.put(metric, longRow.get(metric));
            }
            byRow.computeIfAbsent(rowPath, k -> new LinkedHashMap<>()).put(colPath, cells);
        }

        List<List<Object>> colPaths = new ArrayList<>(colOrder.keySet());
        if (colPaths.isEmpty() && cols.isEmpty()) {
            colPaths.add(Collections.emptyList());
        }
        if (!followEncounterOrder) {
            colPaths.sort(PATH_ORDER);
        }

        List<PivotColumn> columns = new ArrayList<>();
        Map<List<Object>, String> colIds = new LinkedHashMap<>();
        for (int i = 0; i < colPaths.size(); i++) {
            List<Object> path = colPaths.get(i);
            String id = "c" + (i + 1);
            colIds.put(path, id);
            PivotColumn column = new PivotColumn();
            column.setId(id);
            column.setPath(path);
            column.setRole(roleOf(path.size(), cols.size()));
            columns.add(column);
        }

        List<List<Object>> rowPaths = new ArrayList<>(byRow.keySet());
        if (!followEncounterOrder) {
            rowPaths.sort(PATH_ORDER);
        }

        List<PivotRow> resultRows = new ArrayList<>();
        for (List<Object> rowPath : rowPaths) {
            PivotRow row = new PivotRow();
            row.setPath(rowPath);
            row.setRole(roleOf(rowPath.size(), rows.size()));
            row.setLevel(rowPath.size());
            Map<String, Map<String, Object>> values = new LinkedHashMap<>();
            Map<List<Object>, Map<String, Object>> cells = byRow.get(rowPath);
            for (PivotColumn column : columns) {
                Map<String, Object> metricValues = cells.get(column.getPath());
                if (metricValues != null) {
                    values.put(column.getId(), metricValues);
                }
            }
            row.setValues(values);
            resultRows.add(row);
        }

        Result result = new Result();
        result.rowFields = rows;
        result.columnFields = cols;
        result.metrics = metricAliases;
        result.columns = columns;
        result.rows = resultRows;
        result.columnTruncated = columnTruncated;
        return result;
    }

    static List<Object> extractPath(Map<String, Object> row, List<String> fields) {
        List<Object> path = new ArrayList<>();
        for (String field : fields) {
            if (!row.containsKey(field)) {
                break;
            }
            path.add(row.get(field));
        }
        return path;
    }

    static String roleOf(int pathLen, int fieldCount) {
        if (fieldCount == 0 || pathLen == fieldCount) {
            return ROLE_DETAIL;
        }
        if (pathLen == 0) {
            return ROLE_TOTAL;
        }
        return ROLE_SUBTOTAL;
    }

    /**
     * 未指定排序时的兜底：同前缀时更长的（明细）在前，短的（小计/总计）在后；否则按取值正序。
     */
    static final Comparator<List<Object>> PATH_ORDER = (left, right) -> {
        int n = Math.min(left.size(), right.size());
        for (int i = 0; i < n; i++) {
            int cmp = compareValue(left.get(i), right.get(i));
            if (cmp != 0) {
                return cmp;
            }
        }
        if (left.size() == right.size()) {
            return 0;
        }
        return left.size() > right.size() ? -1 : 1;
    };

    private static int compareValue(Object left, Object right) {
        if (left == right) {
            return 0;
        }
        if (left == null) {
            return 1;
        }
        if (right == null) {
            return -1;
        }
        return String.valueOf(left).compareTo(String.valueOf(right));
    }

    public static class Result {
        public List<String> rowFields;
        public List<String> columnFields;
        public List<String> metrics;
        public List<PivotColumn> columns;
        public List<PivotRow> rows;
        public boolean columnTruncated;
    }
}
