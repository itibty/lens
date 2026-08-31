package com.codet.lens.vis.dto.dash;

import com.codet.lens.common.FieldConst;
import com.codet.lens.common.EnumValue;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

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

    @Schema(description = "状态", allowableValues = {FieldConst.EBL, FieldConst.DBL}, requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @EnumValue(strValues = {FieldConst.EBL, FieldConst.DBL})
    private String status;

    @Schema(description = "看板完整配置，必须明确包含 widgets 数组", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "看板配置不能为空")
    private String configJson;

    @Schema(description = "看板卡片成员。布局以 configJson.widgets 为准，此列表仅作兼容占位", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    @Valid
    private List<VisDashboardLayoutItem> cards;
}
