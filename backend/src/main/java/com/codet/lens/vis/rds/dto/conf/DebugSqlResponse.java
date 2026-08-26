package com.codet.lens.vis.rds.dto.conf;


import com.codet.lens.common.FieldConst;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

import java.util.List;
import java.util.Map;

@Schema(description = "渲染sql结果")
@Getter
@Setter
@Accessors(chain = true)
public class DebugSqlResponse {

    @Schema(description = "sql statement", requiredMode = Schema.RequiredMode.REQUIRED)
    private String sql;

    @Schema(description = "sql 参数", requiredMode = Schema.RequiredMode.REQUIRED)
    private Object[] params;

    @Schema(description = "执行阶段耗时信息", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<Object> timeInfos;

    @Schema(description = "sql类型", allowableValues = {FieldConst.DML, FieldConst.DQL}, requiredMode = Schema.RequiredMode.REQUIRED)
    private String sqlType;

    // 需执行后有结果
    @Schema(description = "查询数据结果")
    private Map<String, Object> execRet;

    @Schema(description = "结果列")
    private List<DebugSqlColumn> columns;

    @Schema(description = "响应字段名")
    private String retKey;

    @Schema(description = "错误摘要（失败时）")
    private String error;

    @Schema(description = "完整异常堆栈（失败时，仅调试接口）")
    private String stackTrace;

}
