package com.codet.lens.vis.core.query;

import lombok.Getter;

@Getter
public class SqlColumnMeta {

    private final String field;
    private final String jdbcType;
    private final int jdbcTypeCode;

    public SqlColumnMeta(String field, String jdbcType, int jdbcTypeCode) {
        this.field = field;
        this.jdbcType = jdbcType;
        this.jdbcTypeCode = jdbcTypeCode;
    }
}
