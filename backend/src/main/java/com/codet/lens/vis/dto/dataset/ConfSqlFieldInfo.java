package com.codet.lens.vis.dto.dataset;

import com.codet.lens.common.base.EnumValue;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "数据集字段")
@Getter
@Setter
public class ConfSqlFieldInfo {

    @Schema(description = "列名", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String field;

    @Schema(description = "类型", allowableValues = {"STRING", "NUMBER", "DATE", "DATETIME"},
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @EnumValue(strValues = {"STRING", "NUMBER", "DATE", "DATETIME"})
    private String dataType;

    @Schema(description = "建议用法", allowableValues = {"DIMENSION", "METRIC"},
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @EnumValue(strValues = {"DIMENSION", "METRIC"})
    private String suggestRole;

    @Schema(description = "补充说明")
    private String remark;
}
