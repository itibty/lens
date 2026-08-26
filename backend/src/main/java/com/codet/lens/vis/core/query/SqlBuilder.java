package com.codet.lens.vis.core.query;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.ResultEnum;
import com.codet.lens.common.ResultException;
import com.codet.lens.vis.dto.item.DimensionItem;
import com.codet.lens.vis.dto.item.MetricItem;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SqlBuilder {

    private static final long MAX_LIMIT = 5000;

    public static SqlRet build(QueryBO query) {
        validateQuery(query);

        SqlDialect dialect = query.dialectOrDefault();
        List<String> selectParts = new ArrayList<>();
        List<String> groupByParts = new ArrayList<>();

        if (CollUtil.isNotEmpty(query.getSelectFields())) {
            for (String field : query.getSelectFields()) {
                String quoted = dialect.quote(field);
                selectParts.add(quoted + " AS " + quoted);
            }
        } else {
            if (CollUtil.isNotEmpty(query.getDimensions())) {
                for (DimensionItem dim : query.getDimensions()) {
                    selectParts.add(SqlExprHelper.buildDimSelectExpr(dim, dialect));
                    groupByParts.add(SqlExprHelper.buildDimExpr(dim, dialect));
                }
            }

            if (CollUtil.isNotEmpty(query.getMetrics())) {
                for (MetricItem metric : query.getMetrics()) {
                    selectParts.add(SqlExprHelper.buildMetricSelectExpr(metric, dialect));
                }
            }
        }

        if (selectParts.isEmpty()) {
            throw new ResultException(ResultEnum.FAIL.getCode(), "SELECT 不能为空");
        }

        StringBuilder sql = new StringBuilder("SELECT ");
        sql.append(String.join(", ", selectParts));
        if (StrUtil.isNotBlank(query.getSourceAlias())) {
            sql.append(" FROM ").append(query.getSourceAlias());
        } else {
            sql.append(" FROM (").append(query.getInnerSql()).append(") AS __ds");
        }

        List<Object> allParams = new ArrayList<>();
        if (StrUtil.isBlank(query.getSourceAlias()) && query.getInnerParams() != null) {
            Collections.addAll(allParams, query.getInnerParams());
        }

        SqlExprHelper.appendWhere(sql, query.getFilters(), allParams, query.getAsOfDate(), dialect);

        if (!groupByParts.isEmpty()) {
            sql.append(" GROUP BY ").append(String.join(", ", groupByParts));
        }

        if (!query.isSkipHaving()) {
            SqlExprHelper.appendHaving(sql, query.getHavingFilters(), allParams, query.getAsOfDate(), dialect);
        }

        if (CollUtil.isNotEmpty(query.getResultFilters())) {
            String inner = sql.toString();
            sql.setLength(0);
            sql.append("SELECT * FROM (").append(inner).append(") AS __out");
            StringBuilder where = new StringBuilder();
            SqlExprHelper.appendAliasFilterClause(where, query.getResultFilters(), allParams, query.getAsOfDate(),
                    dialect);
            if (where.length() > 0) {
                sql.append(" WHERE ").append(where);
            }
        }

        if (!query.isSkipOrder()) {
            SqlExprHelper.appendOrderBy(sql, query.getOrderList(), dialect);
        }

        if (!query.isSkipLimit()) {
            int cap = query.getMaxLimit() != null ? query.getMaxLimit() : (int) MAX_LIMIT;
            int limit = query.getLimit() != null ? Math.min(query.getLimit(), cap) : cap;
            sql.append(" LIMIT ").append(limit);
        }

        return new SqlRet(sql.toString(), allParams.toArray());
    }

    private static void validateQuery(QueryBO query) {
        if (query == null) {
            throw new ResultException(ResultEnum.FAIL.getCode(), "query 不能为空");
        }
        if (StrUtil.isBlank(query.getSourceAlias()) && StrUtil.isBlank(query.getInnerSql())) {
            throw new ResultException(ResultEnum.FAIL.getCode(), "innerSql 不能为空");
        }
    }

    public static class SqlRet {

        private final String sql;

        private final Object[] params;

        public SqlRet(String sql, Object[] params) {
            this.sql = sql;
            this.params = params;
        }

        public String getSql() {
            return sql;
        }

        public Object[] getParams() {
            return params;
        }
    }
}
