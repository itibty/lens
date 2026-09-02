package com.codet.lens.vis.core.query;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.base.ResultEnum;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.item.*;
import com.codet.lens.vis.dto.query.*;
import com.codet.lens.vis.enums.ContrastCalcTypeEnum;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 有对比指标时：{@code WITH ds} + main + 每指标两窗 CTE，外层算列后再滤、排、LIMIT。
 * 窗之间按全部维度 JOIN。日期维会导致评估期/对比期桶对不上，设计器禁止该组合，接口不拒。
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ContrastSqlAssembler {

    private static final int MAX_LIMIT = 5000;

    @Getter
    public static final class Result {
        private final SqlBuilder.SqlRet sqlRet;
        private final String asOfDate;
        private final List<ContrastInfo> contrasts;

        private Result(SqlBuilder.SqlRet sqlRet, String asOfDate, List<ContrastInfo> contrasts) {
            this.sqlRet = sqlRet;
            this.asOfDate = asOfDate;
            this.contrasts = contrasts;
        }
    }

    public static boolean hasContrast(List<MetricItem> metrics) {
        if (CollUtil.isEmpty(metrics)) {
            return false;
        }
        for (MetricItem metric : metrics) {
            if (metric != null && metric.getContrast() != null) {
                return true;
            }
        }
        return false;
    }

    public static Result build(QueryBO query) {
        LocalDate today = query != null && query.getAsOfDate() != null ? query.getAsOfDate() : LocalDate.now();
        return build(query, today);
    }

    public static Result build(QueryBO query, LocalDate today) {
        if (query == null || StrUtil.isBlank(query.getInnerSql())) {
            throw fail("innerSql 不能为空");
        }
        if (today == null) {
            today = LocalDate.now();
        }
        List<MetricItem> regulars = new ArrayList<>();
        List<MetricItem> contrasts = new ArrayList<>();
        splitMetrics(query.getMetrics(), regulars, contrasts);
        if (contrasts.isEmpty()) {
            throw fail("没有对比指标");
        }

        List<Object> allParams = new ArrayList<>();
        if (query.getInnerParams() != null) {
            Collections.addAll(allParams, query.getInnerParams());
        }

        StringBuilder sql = new StringBuilder("WITH ds AS (").append(query.getInnerSql()).append(")");
        appendMainCte(sql, query, regulars, allParams, today);

        List<ContrastInfo> infos = new ArrayList<>();
        LocalDate asOfDate = today;
        for (int i = 0; i < contrasts.size(); i++) {
            MetricItem metric = contrasts.get(i);
            ContrastWindowResolver.Window window = ContrastWindowResolver.resolve(metric.getContrast(), today);
            asOfDate = window.getAsOfDate();
            infos.add(ContrastWindowResolver.toInfo(metric, window));
            appendWindowCte(sql, query, metric, "c" + i, "cur", window.getCurrent(), allParams, today);
            appendWindowCte(sql, query, metric, "b" + i, "base", window.getCompare(), allParams, today);
        }

        SqlDialect dialect = query.dialectOrDefault();
        sql.append(" SELECT * FROM (SELECT ");
        sql.append(String.join(", ", buildOuterSelect(query.getDimensions(), regulars, contrasts, dialect)));
        sql.append(" FROM main m");
        appendJoins(sql, query.getDimensions(), contrasts.size(), dialect);
        sql.append(") AS __cmp");

        appendOuterWhere(sql, query.getResultFilters(), allParams, today, dialect);
        SqlExprHelper.appendOrderBy(sql, query.getOrderList(), dialect);
        if (!query.isSkipLimit()) {
            int cap = query.getMaxLimit() != null ? query.getMaxLimit() : MAX_LIMIT;
            int limit = query.getLimit() != null ? Math.min(query.getLimit(), cap) : cap;
            dialect.appendLimit(sql, limit);
        }

        return new Result(new SqlBuilder.SqlRet(sql.toString(), allParams.toArray()),
                asOfDate.toString(), infos);
    }

    private static void splitMetrics(List<MetricItem> metrics, List<MetricItem> regulars, List<MetricItem> contrasts) {
        for (MetricItem metric : CollUtil.emptyIfNull(metrics)) {
            if (metric != null && metric.getContrast() != null) {
                contrasts.add(metric);
            } else if (metric != null) {
                regulars.add(metric);
            }
        }
    }

    private static void appendMainCte(StringBuilder sql, QueryBO query, List<MetricItem> regulars,
                                      List<Object> allParams, LocalDate today) {
        sql.append(", main AS (");
        if (CollUtil.isEmpty(query.getDimensions()) && regulars.isEmpty()) {
            sql.append("SELECT 1 AS ").append(query.dialectOrDefault().quote("__one"));
        } else {
            QueryBO body = cteBody(query, regulars, query.getFilters(), today);
            SqlBuilder.SqlRet ret = SqlBuilder.build(body);
            sql.append(ret.getSql());
            Collections.addAll(allParams, ret.getParams());
        }
        sql.append(")");
    }

    private static void appendWindowCte(StringBuilder sql, QueryBO query, MetricItem metric,
                                        String cteName, String valueAlias, String[] closedRange,
                                        List<Object> allParams, LocalDate today) {
        MetricItem aliased = copyMetric(metric);
        aliased.setLabel(valueAlias);
        aliased.setContrast(null);
        QueryBO body = cteBody(query, Collections.singletonList(aliased),
                filtersForWindow(query.getFilters(), metric.getContrast().getTimeField(), closedRange), today);
        SqlBuilder.SqlRet ret = SqlBuilder.build(body);
        sql.append(", ").append(cteName).append(" AS (").append(ret.getSql()).append(")");
        Collections.addAll(allParams, ret.getParams());
    }

    private static QueryBO cteBody(QueryBO src, List<MetricItem> metrics, List<FilterGroup> filters, LocalDate today) {
        return cteBody(src, src.getDimensions(), metrics, filters, today);
    }

    private static QueryBO cteBody(QueryBO src, List<DimensionItem> dims, List<MetricItem> metrics,
                                   List<FilterGroup> filters, LocalDate today) {
        QueryBO body = new QueryBO();
        body.setDimensions(dims);
        body.setMetrics(metrics);
        body.setFilters(filters);
        body.setSourceAlias("ds");
        body.setSkipLimit(true);
        body.setSkipOrder(true);
        body.setHavingFilters(src.getHavingFilters());
        body.setAsOfDate(today);
        body.setDialect(src.getDialect());
        return body;
    }

    private static List<String> buildOuterSelect(List<DimensionItem> dims, List<MetricItem> regulars,
                                                 List<MetricItem> contrasts, SqlDialect dialect) {
        List<String> parts = new ArrayList<>();
        if (CollUtil.isNotEmpty(dims)) {
            for (DimensionItem dim : dims) {
                String alias = SqlExprHelper.resolveDimAlias(dim);
                parts.add(dialect.qualify("m", alias) + " AS " + dialect.quote(alias));
            }
        }
        if (CollUtil.isNotEmpty(regulars)) {
            for (MetricItem metric : regulars) {
                String alias = SqlExprHelper.resolveMetricAlias(metric);
                parts.add(dialect.qualify("m", alias) + " AS " + dialect.quote(alias));
            }
        }
        for (int i = 0; i < contrasts.size(); i++) {
            MetricItem metric = contrasts.get(i);
            ContrastCalcTypeEnum calcType = ContrastCalcTypeEnum.of(metric.getContrast().getCalcType());
            parts.add(contrastExpr("c" + i, "b" + i, calcType, dialect) + " AS " + dialect.quote(metric.getLabel()));
        }
        if (parts.isEmpty()) {
            parts.add(dialect.qualify("m", "__one"));
        }
        return parts;
    }

    private static String contrastExpr(String curCte, String baseCte, ContrastCalcTypeEnum calcType,
                                       SqlDialect dialect) {
        String cur = dialect.qualify(curCte, "cur");
        String base = dialect.qualify(baseCte, "base");
        if (calcType == ContrastCalcTypeEnum.DIFF) {
            return cur + " - " + base;
        }
        return "(" + cur + " - " + base + ") * 100.0 / NULLIF(" + base + ", 0)";
    }

    private static void appendJoins(StringBuilder sql, List<DimensionItem> dims, int contrastCount,
                                    SqlDialect dialect) {
        String on = joinOn(dims, dialect);
        for (int i = 0; i < contrastCount; i++) {
            sql.append(" LEFT JOIN c").append(i).append(" ON ").append(on.replace("__cte", "c" + i));
            sql.append(" LEFT JOIN b").append(i).append(" ON ").append(on.replace("__cte", "b" + i));
        }
    }

    /** 含日期维时两窗桶值不同，对不上；设计器已禁该组合。 */
    private static String joinOn(List<DimensionItem> dims, SqlDialect dialect) {
        if (CollUtil.isEmpty(dims)) {
            return "1 = 1";
        }
        List<String> parts = new ArrayList<>();
        for (DimensionItem dim : dims) {
            String alias = SqlExprHelper.resolveDimAlias(dim);
            parts.add(dialect.nullSafeEquals(
                    dialect.qualify("m", alias),
                    dialect.qualify("__cte", alias)));
        }
        return String.join(" AND ", parts);
    }

    private static void appendOuterWhere(StringBuilder sql, List<FilterItem> resultFilters,
                                         List<Object> allParams, LocalDate today, SqlDialect dialect) {
        if (CollUtil.isEmpty(resultFilters)) {
            return;
        }
        StringBuilder where = new StringBuilder();
        SqlExprHelper.appendAliasFilterClause(where, resultFilters, allParams, today, dialect);
        if (where.length() > 0) {
            sql.append(" WHERE ").append(where);
        }
    }

    static List<FilterGroup> filtersForWindow(List<FilterGroup> filters, String timeField, String[] closedRange) {
        List<FilterGroup> copied = copyFiltersWithoutField(filters, timeField);
        FilterItem date = new FilterItem();
        date.setField(timeField);
        date.setOp("between");
        date.setValue(new Object[]{closedRange[0], closedRange[1]});
        FilterGroup group = new FilterGroup();
        group.setCombineOp("and");
        group.setConditions(Collections.singletonList(date));
        copied.add(group);
        return copied;
    }

    private static List<FilterGroup> copyFiltersWithoutField(List<FilterGroup> filters, String field) {
        List<FilterGroup> result = new ArrayList<>();
        if (CollUtil.isEmpty(filters)) {
            return result;
        }
        for (FilterGroup group : filters) {
            if (group == null || CollUtil.isEmpty(group.getConditions())) {
                continue;
            }
            List<FilterItem> kept = new ArrayList<>();
            for (FilterItem item : group.getConditions()) {
                if (item != null && !field.equals(item.getField())) {
                    kept.add(copyFilter(item));
                }
            }
            if (kept.isEmpty()) {
                continue;
            }
            FilterGroup copy = new FilterGroup();
            copy.setCombineOp(group.getCombineOp());
            copy.setConditions(kept);
            result.add(copy);
        }
        return result;
    }

    private static FilterItem copyFilter(FilterItem src) {
        return BeanUtil.copyProperties(src, FilterItem.class);
    }

    private static MetricItem copyMetric(MetricItem src) {
        MetricItem dest = BeanUtil.copyProperties(src, MetricItem.class);
        dest.setContrast(null);
        return dest;
    }

    private static ResultException fail(String msg) {
        return new ResultException(ResultEnum.FAIL.getCode(), msg);
    }
}
