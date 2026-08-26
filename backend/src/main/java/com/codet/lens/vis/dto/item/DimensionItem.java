package com.codet.lens.vis.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "维度配置")
@Getter
@Setter
public class DimensionItem extends BaseField {

    @Schema(description = "时间粒度", allowableValues = {"day", "week", "month", "year"})
    private String timeGrain;
}
