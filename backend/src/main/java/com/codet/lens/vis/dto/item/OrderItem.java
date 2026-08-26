package com.codet.lens.vis.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "排序。field 必须是 SELECT 别名（维度/指标有 label 用 label，否则用 field），后端不改写")
@Getter
@Setter
public class OrderItem extends BaseField {

    @Schema(description = "排序方向", allowableValues = {"asc", "desc"}, requiredMode = Schema.RequiredMode.REQUIRED)
    private String dir;
}
