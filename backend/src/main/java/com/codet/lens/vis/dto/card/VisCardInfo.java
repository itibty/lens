package com.codet.lens.vis.dto.card;

import com.codet.lens.common.base.Long2DatetimeStr;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.annotation.JsonSerialize;

@Schema(description = "可视化卡片")
@Getter
@Setter
public class VisCardInfo {

    @Schema(description = "卡片 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long id;

    @Schema(description = "卡片名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String cardName;

    @Schema(description = "卡片描述")
    private String cardDesc;

    @Schema(description = "数据集 id。richtext/url 可为 0")
    private Long datasetId;

    @Schema(description = "图表类型", requiredMode = Schema.RequiredMode.REQUIRED)
    private String chartType;

    @Schema(description = "查询配置")
    private String queryJson;

    @Schema(description = "可视化配置")
    private String visualJson;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String status;

    @Schema(description = "修改时间")
    @JsonSerialize(using = Long2DatetimeStr.class)
    private Long modifyAt;
}
