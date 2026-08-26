package com.codet.lens.vis.rds.bo;

import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
public class SqlSelectResult {

    private final List<Map<String, Object>> rows;
    private final List<SqlColumnMeta> columns;

    public SqlSelectResult(List<Map<String, Object>> rows, List<SqlColumnMeta> columns) {
        this.rows = rows;
        this.columns = columns;
    }
}
