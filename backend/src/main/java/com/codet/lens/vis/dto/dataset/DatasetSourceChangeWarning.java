package com.codet.lens.vis.dto.dataset;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "数据集更换数据源警告")
@Getter
@Setter
public class DatasetSourceChangeWarning {

    public static final String TYPE = "DATASET_SOURCE_CHANGE";

    @Schema(description = "警告类型", requiredMode = Schema.RequiredMode.REQUIRED)
    private String warningType = TYPE;

    @Schema(description = "引用该数据集的卡片数量", requiredMode = Schema.RequiredMode.REQUIRED)
    private Integer referenceCount;

    @Schema(description = "受影响的部分卡片，最多返回 5 张", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<VisCardRefInfo> cards;
}
