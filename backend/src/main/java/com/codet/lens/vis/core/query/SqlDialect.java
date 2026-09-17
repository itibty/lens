package com.codet.lens.vis.core.query;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.enums.TimeGrainEnum;

/**
 * 平台生成 SQL 的数据库方言。数据集原始 SQL 和用户公式保持原样。
 */
public enum SqlDialect {

    MYSQL("MYSQL", '`', '`'),
    POSTGRES("POSTGRES", '"', '"'),
    STARROCKS("STARROCKS", '`', '`');

    private final String typeCode;
    private final char open;
    private final char close;

    SqlDialect(String typeCode, char open, char close) {
        this.typeCode = typeCode;
        this.open = open;
        this.close = close;
    }

    public static SqlDialect of(String typeCategory) {
        return DatasourceType.of(typeCategory).dialect();
    }

    public static boolean supports(String typeCategory) {
        try {
            of(typeCategory);
            return true;
        } catch (ResultException ignored) {
            return false;
        }
    }

    public String getTypeCode() {
        return typeCode;
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

    public String timeGrain(String field, TimeGrainEnum grain) {
        if (this == STARROCKS && grain == TimeGrainEnum.WEEK)
            return "DATE_FORMAT(DATE_TRUNC('week', " + field + "), '%Y-%m-%d')";
        if (this == POSTGRES) {
            return switch (grain) {
                case DAY -> "TO_CHAR(" + field + ", 'YYYY-MM-DD')";
                case WEEK -> "TO_CHAR(DATE_TRUNC('week', " + field + "), 'YYYY-MM-DD')";
                case MONTH -> "TO_CHAR(" + field + ", 'YYYY-MM')";
                case YEAR -> "TO_CHAR(" + field + ", 'YYYY')";
            };
        }
        return switch (grain) {
            case DAY -> "DATE_FORMAT(" + field + ", '%Y-%m-%d')";
            case WEEK -> "DATE_FORMAT(DATE_SUB(DATE(" + field
                    + "), INTERVAL WEEKDAY(" + field + ") DAY), '%Y-%m-%d')";
            case MONTH -> "DATE_FORMAT(" + field + ", '%Y-%m')";
            case YEAR -> "DATE_FORMAT(" + field + ", '%Y')";
        };
    }

    public String nullSafeEquals(String left, String right) {
        if (this == POSTGRES)
            return left + " IS NOT DISTINCT FROM " + right;
        return left + " <=> " + right;
    }

    public String stringExpr(String expr) {
        if (this != MYSQL)
            return "CAST(" + expr + " AS VARCHAR)";
        return "CAST(" + expr + " AS CHAR)";
    }

    public void appendLimit(StringBuilder sql, long limit) {
        sql.append(" LIMIT ").append(Math.max(limit, 0));
    }

    public String paginate(String sql, long offset, long limit) {
        return sql + " LIMIT " + Math.max(limit, 0) + " OFFSET " + Math.max(offset, 0);
    }

}
