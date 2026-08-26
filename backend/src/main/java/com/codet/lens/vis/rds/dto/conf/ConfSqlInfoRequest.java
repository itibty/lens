package com.codet.lens.vis.rds.dto.conf;

import com.codet.lens.common.EnumValue;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;


@Schema(description = "新增|编辑 sql脚本信息 请求体")
@Getter
@Setter
public class ConfSqlInfoRequest {
    @Schema(description = "数据id")
    private Long id;

    @Schema(description = "名称", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String sqlName;

    @Schema(description = "描述")
    private String sqlDesc;

    @Schema(description = "数据源id", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    private Long dsId;

    @Schema(description = "sql模板引擎", allowableValues = {"ENJOY"}, requiredMode = Schema.RequiredMode.REQUIRED)
    @EnumValue(strValues = {"ENJOY"})
    @NotNull
    private String tplEngine;

    @Schema(description = "账号状态", allowableValues = {"EBL", "DBL"}, requiredMode = Schema.RequiredMode.REQUIRED)
    @EnumValue(strValues = {"EBL", "DBL"})
    @NotNull
    private String status;
}
