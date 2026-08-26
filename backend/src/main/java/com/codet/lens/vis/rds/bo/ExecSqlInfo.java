package com.codet.lens.vis.rds.bo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "实际执行的 SQL")
@Getter
@Setter
public class ExecSqlInfo {

    @Schema(description = "用途", requiredMode = Schema.RequiredMode.REQUIRED)
    private String name;

    @Schema(description = "SQL 语句", requiredMode = Schema.RequiredMode.REQUIRED)
    private String sql;

    @Schema(description = "绑定参数", requiredMode = Schema.RequiredMode.REQUIRED)
    private Object[] params;
}
