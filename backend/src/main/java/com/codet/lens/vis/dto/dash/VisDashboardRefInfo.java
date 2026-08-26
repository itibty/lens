package com.codet.lens.vis.dto.dash;

import com.codet.lens.common.FieldConst;
import com.codet.lens.common.Long2DatetimeStr;
import tools.jackson.databind.annotation.JsonSerialize;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "卡片引用的看板")
@Getter
@Setter
public class VisDashboardRefInfo {

    @Schema(description = "看板 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long id;

    @Schema(description = "看板名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String dashName;

    @Schema(description = "状态", allowableValues = {FieldConst.EBL, FieldConst.DBL},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String status;

    @Schema(description = "修改时间")
    @JsonSerialize(using = Long2DatetimeStr.class)
    private Long modifyAt;
}
