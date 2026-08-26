package com.codet.lens.vis.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Schema(description = "行级过滤组")
@Getter
@Setter
public class FilterGroup {

    @Schema(description = "组内连接", allowableValues = {"and", "or"}, requiredMode = Schema.RequiredMode.REQUIRED)
    private String combineOp;

    @Schema(description = "组内条件", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<FilterItem> conditions;
}
