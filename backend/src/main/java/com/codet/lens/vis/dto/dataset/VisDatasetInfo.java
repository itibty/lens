package com.codet.lens.vis.dto.dataset;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "可视化数据集")
@Getter
@Setter
public class VisDatasetInfo {

    @Schema(description = "数据集 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long id;

    @Schema(description = "名称", requiredMode = Schema.RequiredMode.REQUIRED)
    private String sqlName;

    @Schema(description = "备注")
    private String sqlDesc;
}
