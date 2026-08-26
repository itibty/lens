package com.codet.lens.vis.dto.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "对比日期闭区间")
@Getter
@Setter
public class ContrastRange {

    @Schema(description = "日期快捷")
    private String valueExp;

    @Schema(description = "闭区间起，yyyy-MM-dd", requiredMode = Schema.RequiredMode.REQUIRED)
    private String start;

    @Schema(description = "闭区间止，yyyy-MM-dd", requiredMode = Schema.RequiredMode.REQUIRED)
    private String end;
}
