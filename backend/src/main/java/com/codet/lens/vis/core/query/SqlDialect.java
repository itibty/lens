package com.codet.lens.vis.core.query;

import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.FieldConst;

import java.util.Locale;

/**
 * 标识符引号。来自 {@code ConfDs.typeCategory}。
 * MySQL 系反引号；Trino / Postgres / Oracle 双引号。不改写 formula / 数据集 SQL。
 */
public enum SqlDialect {

    MYSQL('`', '`'),
    ANSI('"', '"');

    private final char open;
    private final char close;

    SqlDialect(char open, char close) {
        this.open = open;
        this.close = close;
    }

    public static SqlDialect of(String typeCategory) {
        if (StrUtil.isBlank(typeCategory)) {
            return MYSQL;
        }
        String type = typeCategory.trim().toUpperCase(Locale.ROOT);
        if (FieldConst.POSTGRES.equals(type)
                || "POSTGRESQL".equals(type)
                || FieldConst.ORACLE.equals(type)
                || FieldConst.ORACLE_12C.equals(type)
                || "TRINO".equals(type)
                || "PRESTO".equals(type)
                || "PRESTOSQL".equals(type)) {
            return ANSI;
        }
        return MYSQL;
    }

    public String quote(String ident) {
        if (ident == null) {
            return null;
        }
        String escaped = ident.replace(String.valueOf(close), String.valueOf(close) + close);
        return open + escaped + close;
    }

    public String qualify(String relation, String ident) {
        return relation + "." + quote(ident);
    }
}
