package com.codet.lens.vis.core.query;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.codet.lens.vis.dto.item.*;
import com.codet.lens.vis.enums.AggFunctionEnum;
import com.codet.lens.vis.enums.FilterOpEnum;
import com.codet.lens.vis.enums.SortDirEnum;
import com.codet.lens.vis.enums.TimeGrainEnum;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * 可视化 SQL 拼装（聚合/条件表达式、WHERE/HAVING/ORDER）。完整性校验在 {@link VisQueryPrep}。
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SqlExprHelper {

    private static final Pattern ISO_DATE = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    public static String buildAggExpr(String agg, String field, SqlDialect dialect) {
        String quoted = dialectOrDefault(dialect).quote(field);
        String aggUpper = agg.toUpperCase();
        if (AggFunctionEnum.COUNT_DISTINCT.getCode().equals(aggUpper)) {
            return AggFunctionEnum.COUNT_DISTINCT.getValue() + "(DISTINCT " + quoted + ")";
        }
        return AggFunctionEnum.valueOf(aggUpper).getValue() + "(" + quoted + ")";
    }

    public static void appendCondition(String leftExpr, String op, Object[] values, String valueExp,
                                       StringBuilder clause, List<Object> allParams) {
        appendCondition(leftExpr, op, values, valueExp, clause, allParams, null);
    }

    public static void appendCondition(String leftExpr, String op, Object[] values, String valueExp,
                                       StringBuilder clause, List<Object> allParams, LocalDate today) {
        if (StrUtil.isNotBlank(valueExp)) {
            String[] range = DateValueExpResolver.resolve(valueExp, values, todayOrNow(today));
            appendDateRangeHalfOpen(leftExpr, range[0], range[1], clause, allParams);
            return;
        }
        buildConditionExpr(leftExpr, op, values, clause, allParams);
    }

    public static void buildConditionExpr(String leftExpr, String op, Object[] values,
                                          StringBuilder clause, List<Object> allParams) {
        FilterOpEnum opEnum = FilterOpEnum.valueOf(op.toUpperCase());

        switch (opEnum) {
            case IS_NULL:
                clause.append(leftExpr).append(" ").append(opEnum.getValue());
                return;
            case IS_NOT_NULL:
                clause.append(leftExpr).append(" ").append(opEnum.getValue());
                return;
            case IN:
            case NOT_IN:
                String inPlaceholders = String.join(", ", Collections.nCopies(values.length, "?"));
                Collections.addAll(allParams, values);
                clause.append(leftExpr)
                        .append(" ").append(opEnum.getValue())
                        .append(" (").append(inPlaceholders).append(")");
                return;
            case BETWEEN:
                if (isDateOnlyRange(values)) {
                    appendDateRangeHalfOpen(leftExpr, String.valueOf(values[0]), String.valueOf(values[1]),
                            clause, allParams);
                    return;
                }
                allParams.add(values[0]);
                allParams.add(values[1]);
                clause.append(leftExpr)
                        .append(" ").append(opEnum.getValue())
                        .append(" ? AND ?");
                return;
            case LIKE:
            case NOT_LIKE:
                allParams.add("%" + values[0] + "%");
                clause.append(leftExpr)
                        .append(" ").append(opEnum.getValue()).append(" ?");
                return;
            default:
                allParams.add(values[0]);
                clause.append(leftExpr)
                        .append(" ").append(opEnum.getValue()).append(" ?");
        }
    }

    /**
     * {@code field >= start 00:00:00 AND field < end+1 00:00:00}，外加括号以便出现在 OR 组里。
     */
    public static void appendDateRangeHalfOpen(String leftExpr, String startInclusive, String endInclusive,
                                              StringBuilder clause, List<Object> allParams) {
        String[] bounds = DateValueExpResolver.toHalfOpenDateTime(startInclusive, endInclusive);
        allParams.add(Timestamp.valueOf(bounds[0]));
        allParams.add(Timestamp.valueOf(bounds[1]));
        clause.append("(").append(leftExpr).append(" >= ? AND ").append(leftExpr).append(" < ?)");
    }

    private static boolean isDateOnlyRange(Object[] values) {
        return values != null && values.length >= 2 && isIsoDate(values[0]) && isIsoDate(values[1]);
    }

    private static boolean isIsoDate(Object raw) {
        return raw != null && ISO_DATE.matcher(String.valueOf(raw).trim()).matches();
    }

    public static String resolveDimAlias(DimensionItem dim) {
        return StrUtil.isNotBlank(dim.getLabel()) ? dim.getLabel() : dim.getField();
    }

    public static String buildDimExpr(DimensionItem dim, SqlDialect dialect) {
        String field = dialectOrDefault(dialect).quote(dim.getField());
        TimeGrainEnum grain = TimeGrainEnum.of(dim.getTimeGrain());
        if (grain == null) {
            return field;
        }
        return dialectOrDefault(dialect).timeGrain(field, grain);
    }

    public static String buildDimSelectExpr(DimensionItem dim, SqlDialect dialect) {
        return buildDimExpr(dim, dialect) + " AS " + dialectOrDefault(dialect).quote(resolveDimAlias(dim));
    }

    /** 有 label 则 AS label，否则 AS field */
    public static String resolveMetricAlias(MetricItem metric) {
        return StrUtil.isNotBlank(metric.getLabel()) ? metric.getLabel() : metric.getField();
    }

    public static String buildMetricSelectExpr(MetricItem metric, SqlDialect dialect) {
        String expr = StrUtil.isNotBlank(metric.getFormula())
                ? metric.getFormula()
                : buildAggExpr(metric.getAgg(), metric.getField(), dialect);
        return expr + " AS " + dialectOrDefault(dialect).quote(resolveMetricAlias(metric));
    }

    public static void appendWhere(StringBuilder sql, List<FilterGroup> filters, List<Object> allParams,
                                   LocalDate today, SqlDialect dialect) {
        if (CollUtil.isEmpty(filters)) {
            return;
        }
        SqlDialect d = dialectOrDefault(dialect);
        StringBuilder whereClause = new StringBuilder();
        for (FilterGroup group : filters) {
            String joiner = "or".equalsIgnoreCase(group.getCombineOp()) ? " OR " : " AND ";
            StringBuilder groupClause = new StringBuilder();
            for (FilterItem filter : CollUtil.emptyIfNull(group.getConditions())) {
                if (groupClause.length() > 0) {
                    groupClause.append(joiner);
                }
                appendCondition(filterLeftExpr(filter, d), filter.getOp(), filter.getValue(), filter.getValueExp(),
                        groupClause, allParams, today);
            }
            if (groupClause.length() > 0) {
                if (whereClause.length() > 0) {
                    whereClause.append(" AND ");
                }
                whereClause.append("(").append(groupClause).append(")");
            }
        }
        if (whereClause.length() > 0) {
            sql.append(" WHERE ").append(whereClause);
        }
    }

    public static void appendHaving(StringBuilder sql, List<HavingFilterItem> havingFilters, List<Object> allParams,
                                    LocalDate today, SqlDialect dialect) {
        StringBuilder havingClause = new StringBuilder();
        appendAggHavingClause(havingClause, havingFilters, allParams, today, dialect);
        if (havingClause.length() > 0) {
            sql.append(" HAVING ").append(havingClause);
        }
    }

    public static void appendAggHavingClause(StringBuilder havingClause, List<HavingFilterItem> havingFilters,
                                             List<Object> allParams, LocalDate today, SqlDialect dialect) {
        if (CollUtil.isEmpty(havingFilters)) {
            return;
        }
        for (HavingFilterItem havingFilter : havingFilters) {
            if (havingClause.length() > 0) {
                havingClause.append(" AND ");
            }
            String leftExpr = StrUtil.isNotBlank(havingFilter.getFormula())
                    ? havingFilter.getFormula()
                    : buildAggExpr(havingFilter.getAgg(), havingFilter.getField(), dialect);
            appendCondition(leftExpr, havingFilter.getOp(), havingFilter.getValue(), havingFilter.getValueExp(),
                    havingClause, allParams, today);
        }
    }

    public static void appendAliasFilterClause(StringBuilder clause, List<FilterItem> filters,
                                               List<Object> allParams, LocalDate today, SqlDialect dialect) {
        if (CollUtil.isEmpty(filters)) {
            return;
        }
        SqlDialect d = dialectOrDefault(dialect);
        for (FilterItem filter : filters) {
            if (clause.length() > 0) {
                clause.append(" AND ");
            }
            appendCondition(filterLeftExpr(filter, d), filter.getOp(), filter.getValue(), filter.getValueExp(),
                    clause, allParams, today);
        }
    }

    public static void appendOrderBy(StringBuilder sql, List<OrderItem> orderList, SqlDialect dialect) {
        if (CollUtil.isEmpty(orderList)) {
            return;
        }
        SqlDialect d = dialectOrDefault(dialect);
        List<String> orderParts = new ArrayList<>();
        for (OrderItem order : orderList) {
            String dir = SortDirEnum.DESC.getCode().equalsIgnoreCase(order.getDir())
                    ? SortDirEnum.DESC.getValue()
                    : SortDirEnum.ASC.getValue();
            orderParts.add(d.quote(order.getField()) + " " + dir);
        }
        sql.append(" ORDER BY ").append(String.join(", ", orderParts));
    }

    /** 带 timeGrain 时按数据库方言使用维度同一表达式过滤，否则用原字段。 */
    public static String filterLeftExpr(FilterItem filter, SqlDialect dialect) {
        SqlDialect d = dialectOrDefault(dialect);
        String field = d.quote(filter.getField());
        TimeGrainEnum grain = TimeGrainEnum.of(filter.getTimeGrain());
        return grain == null ? field : d.timeGrain(field, grain);
    }

    private static LocalDate todayOrNow(LocalDate today) {
        return today != null ? today : LocalDate.now();
    }

    private static SqlDialect dialectOrDefault(SqlDialect dialect) {
        return dialect != null ? dialect : SqlDialect.MYSQL;
    }
}
