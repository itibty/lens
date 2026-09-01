package com.codet.lens.vis.core.query;

import java.util.List;
import java.util.Map;
import lombok.Getter;

@Getter
public class SqlSelectResult {

    private final List<Map<String, Object>> rows;
    private final List<SqlColumnMeta> columns;

    public SqlSelectResult(List<Map<String, Object>> rows, List<SqlColumnMeta> columns) {
        this.rows = rows;
        this.columns = columns;
    }
}
