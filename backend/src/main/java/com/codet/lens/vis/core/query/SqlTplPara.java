package com.codet.lens.vis.core.query;

import java.util.Map;
import lombok.Getter;

@Getter
public class SqlTplPara {

    /**
     * sql配置 id
     */
    private Long sqlId;

    /**
     * 数据源名
     */
    private String dsName;

    /**
     * sql模板
     */
    private final String sqlTpl;

    /**
     * 模板动态参数
     */
    private final Map<String, Object> params;

    public SqlTplPara(Long sqlId, String dsName, String sqlTpl, Map<String, Object> params) {
        this.sqlId = sqlId;
        this.dsName = dsName;
        this.sqlTpl = sqlTpl;
        this.params = params;
    }

    public SqlTplPara(String dsName, String sqlTpl, Map<String, Object> params) {
        this.dsName = dsName;
        this.sqlTpl = sqlTpl;
        this.params = params;
    }

    public SqlTplPara(String sqlTpl, Map<String, Object> params) {
        this.sqlTpl = sqlTpl;
        this.params = params;
    }
}
