package com.codet.lens.vis.rds.core;

import com.codet.lens.vis.rds.bo.ExecSqlInfo;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class QueryContext {

    /** 最大返回行数，null 表示使用默认值 */
    private Integer maxRows;

    /** JDBC fetchSize，null 表示使用默认值 */
    private Integer fetchSize;

    /** 执行后回写：结果是否被截断 */
    private boolean truncated;

    /** SHOW_SQL + ds:sql:conf 时记下执行 SQL */
    private boolean showSql;

    /** 下一条 select 的名称，用完即清 */
    private String nextSqlName;

    private final List<ExecSqlInfo> execSqls = new ArrayList<>();

    public QueryContext() {}

    public QueryContext(Integer maxRows, Integer fetchSize) {
        this.maxRows = maxRows;
        this.fetchSize = fetchSize;
    }

    public void recordSql(String sql, Object[] params) {
        if (!showSql) {
            return;
        }
        ExecSqlInfo info = new ExecSqlInfo();
        info.setName(nextSqlName != null ? nextSqlName : "sql" + (execSqls.size() + 1));
        info.setSql(sql);
        info.setParams(params);
        execSqls.add(info);
        nextSqlName = null;
    }

    public static QueryContext defaults() {
        return new QueryContext(null, null);
    }
}
