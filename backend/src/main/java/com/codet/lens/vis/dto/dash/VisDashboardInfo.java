package com.codet.lens.vis.dto.dash;

import com.codet.lens.common.FieldConst;
import com.codet.lens.common.Long2DatetimeStr;
import tools.jackson.databind.annotation.JsonSerialize;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Schema(description = "可视化看板")
@Getter
@Setter
public class VisDashboardInfo {

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

    @Schema(description = "状态", allowableValues = {FieldConst.EBL, FieldConst.DBL},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String status;

    @Schema(description = "看板配置")
    private String configJson;

    @Schema(description = "看板卡片")
    private List<VisDashboardLayoutItem> cards;

    @Schema(description = "修改时间")
    @JsonSerialize(using = Long2DatetimeStr.class)
    private Long modifyAt;
}
