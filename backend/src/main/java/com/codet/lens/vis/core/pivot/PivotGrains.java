package com.codet.lens.vis.core.pivot;

import cn.hutool.core.collection.CollUtil;
import com.codet.lens.vis.dto.item.DimensionItem;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 按行/列小计、总计开关生成同级 GROUP BY 粒度（行粒度 × 列粒度）。
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class PivotGrains {

    @Getter
    public static final class Grain {
        private final List<DimensionItem> rowDims;
        private final List<DimensionItem> colDims;
        private final int rowLevel;
        private final int colLevel;
        private final boolean detail;

        private Grain(List<DimensionItem> rowDims, List<DimensionItem> colDims, boolean detail) {
            this.rowDims = rowDims;
            this.colDims = colDims;
            this.rowLevel = rowDims.size();
            this.colLevel = colDims.size();
            this.detail = detail;
        }

        public List<DimensionItem> allDims() {
            List<DimensionItem> all = new ArrayList<>(rowDims.size() + colDims.size());
            all.addAll(rowDims);
            all.addAll(colDims);
            return all;
        }
    }

    public static List<Grain> of(List<DimensionItem> rowDims, List<DimensionItem> colDims, Map<String, Object> visual) {
        boolean rowSubtotal = flag(visual, "rowSubtotal");
        boolean rowTotal = flag(visual, "rowTotal");
        boolean colSubtotal = flag(visual, "columnSubtotal");
        boolean colTotal = flag(visual, "columnTotal");

        List<List<DimensionItem>> rowLevels = levels(rowDims, rowSubtotal, rowTotal);
        List<List<DimensionItem>> colLevels = levels(colDims, colSubtotal, colTotal);

        List<DimensionItem> fullRows = CollUtil.emptyIfNull(rowDims);
        List<DimensionItem> fullCols = CollUtil.emptyIfNull(colDims);
        List<Grain> grains = new ArrayList<>();
        for (List<DimensionItem> rows : rowLevels) {
            for (List<DimensionItem> cols : colLevels) {
                boolean detail = rows.size() == fullRows.size() && cols.size() == fullCols.size();
                grains.add(new Grain(rows, cols, detail));
            }
        }
        return grains;
    }

    private static boolean flag(Map<String, Object> visual, String key) {
        if (visual == null) {
            return false;
        }
        Object value = visual.get(key);
        return Boolean.TRUE.equals(value) || "true".equalsIgnoreCase(String.valueOf(value));
    }

    /**
     * 始终含完整维度（明细）；小计=真前缀；总计=空列表（完整已是空时不重复）。
     */
    static List<List<DimensionItem>> levels(List<DimensionItem> dims, boolean subtotal, boolean total) {
        List<DimensionItem> full = new ArrayList<>(CollUtil.emptyIfNull(dims));
        List<List<DimensionItem>> out = new ArrayList<>();
        out.add(full);
        if (subtotal) {
            for (int i = 1; i < full.size(); i++) {
                out.add(new ArrayList<>(full.subList(0, i)));
            }
        }
        if (total && !full.isEmpty()) {
            out.add(Collections.emptyList());
        }
        return out;
    }
}
