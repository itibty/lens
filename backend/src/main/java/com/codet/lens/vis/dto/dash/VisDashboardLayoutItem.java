package com.codet.lens.vis.dto.dash;

import com.codet.lens.common.FieldConst;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotNull;

@Schema(description = "看板卡片关联")
@Getter
@Setter
public class VisDashboardLayoutItem {

    @Schema(description = "卡片 id", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    private Long cardId;

    @Schema(description = "已废弃。布局在 configJson.widgets，保存时忽略")
    private String layoutJson;

    @Schema(description = "卡片状态。详情返回，保存时忽略", allowableValues = {FieldConst.EBL, FieldConst.DBL})
    private String status;
}
