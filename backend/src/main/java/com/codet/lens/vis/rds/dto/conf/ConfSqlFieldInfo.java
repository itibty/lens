package com.codet.lens.vis.rds.dto.conf;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "数据集字段")
@Getter
@Setter
public class ConfSqlFieldInfo {

    @Schema(description = "列名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String field;

    @Schema(description = "类型", allowableValues = {"STRING", "NUMBER", "DATE", "DATETIME"},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String dataType;

    @Schema(description = "建议用法", allowableValues = {"DIMENSION", "METRIC"},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String suggestRole;
}
