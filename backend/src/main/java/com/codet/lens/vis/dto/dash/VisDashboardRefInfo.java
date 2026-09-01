package com.codet.lens.vis.dto.dash;

import com.codet.lens.common.base.Long2DatetimeStr;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.annotation.JsonSerialize;

@Schema(description = "卡片引用的看板")
@Getter
@Setter
public class VisDashboardRefInfo {

    @Schema(description = "看板 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long id;

    @Schema(description = "看板名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String dashName;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String status;

    @Schema(description = "修改时间")
    @JsonSerialize(using = Long2DatetimeStr.class)
    private Long modifyAt;
}
