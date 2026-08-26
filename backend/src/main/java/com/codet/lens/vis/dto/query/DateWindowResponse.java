package com.codet.lens.vis.dto.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "日期快捷预览结果")
@Getter
@Setter
public class DateWindowResponse {

    @Schema(description = "日期快捷基准日", requiredMode = Schema.RequiredMode.REQUIRED)
    private String asOfDate;

    @Schema(description = "当前期", requiredMode = Schema.RequiredMode.REQUIRED)
    private ContrastRange current;

    @Schema(description = "对比期。未传 calcMethod 时为空")
    private ContrastRange compare;
}
