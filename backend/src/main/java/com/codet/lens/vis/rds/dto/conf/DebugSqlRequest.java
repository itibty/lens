package com.codet.lens.vis.rds.dto.conf;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

@Schema(description = "渲染sql请求体")
@Getter
@Setter
@Accessors(chain = true)
public class DebugSqlRequest {

    @Schema(description = "sql脚本模板", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String sqlContent;

    @Schema(description = "sql脚本模板", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    private Boolean execSql;

    @Schema(description = "sql执行参数", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    private Map<String, Object> params;

    @Schema(description = "脚本配置id（运行时必须）")
    private Long id;
}
