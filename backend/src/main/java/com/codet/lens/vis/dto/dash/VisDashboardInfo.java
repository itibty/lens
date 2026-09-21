package com.codet.lens.vis.dto.dash;

import com.codet.lens.common.base.Status;
import com.codet.lens.vis.dto.ResourceAuditInfo;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "可视化看板")
@Getter
@Setter
public class VisDashboardInfo extends ResourceAuditInfo {

    @Schema(description = "看板 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long id;

    @Schema(description = "分组 id")
    private Long groupId;

    @Schema(description = "分组名")
    private String groupName;

    @Schema(description = "看板名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String dashName;

    @Schema(description = "描述")
    private String dashDesc;

    @Schema(description = "图标")
    private String icon;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String status;

    @Schema(description = "看板配置")
    private String configJson;

    @Schema(description = "看板卡片")
    private List<VisDashboardLayoutItem> cards;
}
