package com.codet.lens.vis.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BaseField {

    @Schema(description = "字段名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String field;

    @Schema(description = "显示别名")
    private String label;
}
