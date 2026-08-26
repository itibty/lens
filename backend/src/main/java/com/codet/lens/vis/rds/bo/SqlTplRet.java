package com.codet.lens.vis.rds.bo;

import lombok.Getter;
import lombok.Setter;

@Getter
public class SqlTplRet {

    /**
     * sql Id
     */
    private final Long sqlId;

    /**
     * 数据源名
     */
    @Setter
    private String dsName;

    /**
     * sql
     */
    private final String sql;

    /**
     * sql参数
     */
    private final Object[] params;

    public SqlTplRet(Long sqlId, String dsName, String sql, Object[] params) {
        this.sqlId = sqlId;
        this.dsName = dsName;
        this.sql = sql;
        this.params = params;
    }
}
