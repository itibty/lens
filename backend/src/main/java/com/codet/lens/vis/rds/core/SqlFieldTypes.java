package com.codet.lens.vis.rds.core;

import java.sql.Types;

/**
 * JDBC 类型 → 数据集 data_type / 建议角色。仅预填，人以保存值为准。
 */
public final class SqlFieldTypes {

    public static final String STRING = "STRING";
    public static final String NUMBER = "NUMBER";
    public static final String DATE = "DATE";
    public static final String DATETIME = "DATETIME";

    public static final String DIMENSION = "DIMENSION";
    public static final String METRIC = "METRIC";

    private SqlFieldTypes() {
    }

    public static String toDataType(int jdbcType) {
        switch (jdbcType) {
            case Types.TINYINT:
            case Types.SMALLINT:
            case Types.INTEGER:
            case Types.BIGINT:
            case Types.FLOAT:
            case Types.REAL:
            case Types.DOUBLE:
            case Types.NUMERIC:
            case Types.DECIMAL:
                return NUMBER;
            case Types.DATE:
                return DATE;
            case Types.TIME:
            case Types.TIME_WITH_TIMEZONE:
            case Types.TIMESTAMP:
            case Types.TIMESTAMP_WITH_TIMEZONE:
                return DATETIME;
            default:
                return STRING;
        }
    }

    public static String suggestRole(String dataType) {
        return NUMBER.equals(dataType) ? METRIC : DIMENSION;
    }
}
