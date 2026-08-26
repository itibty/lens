package com.codet.lens.vis.core.query;

import com.codet.lens.vis.dto.item.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

/**
 * 查询业务对象（BO）。
 * <p>
 * 由 {@code Service} 层组装后交给 {@link SqlBuilder#build(QueryBO)}，生成如下结构的 SQL：
 * <pre>
 * SELECT dim1 AS label, SUM(field) AS label
 * FROM (innerSql) AS __ds
 * WHERE (conditions) AND (conditions)
 * GROUP BY dim1
 * HAVING agg(field) op value
 * ORDER BY field asc/desc
 * LIMIT n
 * </pre>
 *
 * @see SqlBuilder
 */
@Getter
@Setter
public class QueryBO {

    /** 维度 */
    private List<DimensionItem> dimensions;

    /** 指标 */
    private List<MetricItem> metrics;

    /** 明细列（数据集字段）。有值则 SELECT 这些列，忽略维度 / 指标，也不 GROUP BY */
    private List<String> selectFields;

    /** 行级过滤 */
    private List<FilterGroup> filters;

    /** 聚合后过滤 */
    private List<HavingFilterItem> havingFilters;

    /** 结果列过滤 */
    private List<FilterItem> resultFilters;

    /** 日期快捷基准日 */
    private LocalDate asOfDate;

    /** 排序 */
    private List<OrderItem> orderList;

    /** 行数上限 */
    private Integer limit;

    /** 行数上限封顶 */
    private Integer maxLimit;

    /** 是否跳过 LIMIT */
    private boolean skipLimit;

    /** 是否跳过 HAVING */
    private boolean skipHaving;

    /** 是否跳过 ORDER BY */
    private boolean skipOrder;

    /** FROM 别名 */
    private String sourceAlias;

    /** 子查询 SQL */
    private String innerSql;

    /** 子查询参数 */
    private Object[] innerParams;

    /** 标识符引号方言，空则 MySQL 反引号 */
    private SqlDialect dialect;

    public SqlDialect dialectOrDefault() {
        return dialect != null ? dialect : SqlDialect.MYSQL;
    }
}

