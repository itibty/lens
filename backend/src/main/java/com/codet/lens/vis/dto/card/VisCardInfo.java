package com.codet.lens.vis.dto.card;

import com.codet.lens.common.base.Status;
import com.codet.lens.vis.dto.ResourceAuditInfo;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "可视化卡片")
@Getter
@Setter
public class VisCardInfo extends ResourceAuditInfo {

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
}
