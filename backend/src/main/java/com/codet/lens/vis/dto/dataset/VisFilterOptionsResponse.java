package com.codet.lens.vis.dto.dataset;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Schema(description = "筛选枚举结果")
@Getter
@Setter
public class VisFilterOptionsResponse {

    @Schema(description = "选项", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<VisFilterOptionItem> list;

    @Schema(description = "是否被截断", requiredMode = Schema.RequiredMode.REQUIRED)
    private Boolean truncated;
}
