package com.codet.lens.vis.rds.dto.conf;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "sql脚本")
@Getter
@Setter
public class ConfSqlInfo {

    @Schema(description = "数据id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long id;

    @Schema(description = "名称", requiredMode = Schema.RequiredMode.REQUIRED)
    private String sqlName;

    @Schema(description = "备注(对sql中动态参数做说明)")
    private String sqlDesc;

    @Schema(description = "sql脚本")
    private String sqlContent;

    @Schema(description = "调用参数示例")
    private String sqlParams;

    @Schema(description = "数据源id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long dsId;

    @Schema(description = "数据源名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String dsName;

    @Schema(description = "状态", requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"EBL", "DBL"})
    private String status;

    @Schema(description = "模板引擎", requiredMode = Schema.RequiredMode.REQUIRED, allowableValues = {"ENJOY"})
    private String tplEngine;
}
