package com.codet.lens.vis.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "聚合后过滤")
@Getter
@Setter
public class HavingFilterItem extends FilterItem {

    @Schema(description = "聚合函数",
            allowableValues = {"SUM", "COUNT", "AVG", "MIN", "MAX", "COUNT_DISTINCT"})
    private String agg;

    @Schema(description = "计算公式")
    private String formula;
}
