package com.codet.lens.vis.dto.card;

import com.codet.lens.common.base.EnumValue;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "新建|编辑卡片")
@Getter
@Setter
public class VisCardSaveRequest {

    @Schema(description = "卡片 id")
    private Long id;

    @Schema(description = "卡片名", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @Size(max = 50)
    private String cardName;

    @Schema(description = "卡片描述")
    @Size(max = 200)
    private String cardDesc;

    @Schema(description = "数据集 id。richtext/url 可不传")
    private Long datasetId;

    @Schema(description = "图表类型", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @Size(max = 16)
    private String chartType;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL}, requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @EnumValue(strValues = {Status.EBL, Status.DBL})
    private String status;

    @Schema(description = "查询配置。richtext/url 可不传")
    private String queryJson;

    @Schema(description = "可视化配置", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String visualJson;
}
