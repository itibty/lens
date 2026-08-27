package com.codet.lens.vis.dto.dataset;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "引用数据集的卡片")
@Getter
@Setter
public class VisCardRefInfo {

    @Schema(description = "卡片 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long id;

    @Schema(description = "卡片名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String cardName;

    @Schema(description = "卡片状态", requiredMode = Schema.RequiredMode.REQUIRED)
    private String status;
}
