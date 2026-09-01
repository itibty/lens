package com.codet.lens.vis.dto.dash;

import com.codet.lens.common.base.EnumValue;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "新建|编辑看板")
@Getter
@Setter
public class VisDashboardSaveRequest {

    @Schema(description = "看板 id。空为新建")
    private Long id;

    @Schema(description = "分组 id。0 或不传表示挂到报表中心根下")
    private Long groupId;

    @Schema(description = "看板名", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @Size(max = 50)
    private String dashName;

    @Schema(description = "描述")
    @Size(max = 200)
    private String dashDesc;

    @Schema(description = "图标")
    @Size(max = 50)
    private String icon;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL}, requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @EnumValue(strValues = {Status.EBL, Status.DBL})
    private String status;

    @Schema(description = "看板完整配置，必须明确包含 widgets 数组", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "看板配置不能为空")
    private String configJson;

    @Schema(description = "看板卡片成员。布局以 configJson.widgets 为准，此列表仅作兼容占位", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    @Valid
    private List<VisDashboardLayoutItem> cards;
}
