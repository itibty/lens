package com.codet.lens.vis.dto.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "对比指标窗口")
@Getter
@Setter
public class ContrastInfo {

    @Schema(description = "结果列名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String label;

    @Schema(description = "对比日期字段", requiredMode = Schema.RequiredMode.REQUIRED)
    private String timeField;

    @Schema(description = "平移算法", allowableValues = {
            "shift_day", "shift_week", "shift_month", "shift_year", "shift_period"
    }, requiredMode = Schema.RequiredMode.REQUIRED)
    private String calcMethod;

    @Schema(description = "结果列类型", allowableValues = {"diff", "diffRate"},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String calcType;

    @Schema(description = "当前期", requiredMode = Schema.RequiredMode.REQUIRED)
    private ContrastRange current;

    @Schema(description = "对比期", requiredMode = Schema.RequiredMode.REQUIRED)
    private ContrastRange compare;
}
