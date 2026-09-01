package com.codet.lens.vis.dto.card;

import com.codet.lens.common.base.EnumValue;
import com.codet.lens.common.base.PageRequest;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "卡片分页查询")
@Getter
@Setter
public class QueryVisCardRequest extends PageRequest {

    @Schema(description = "卡片 id")
    private Long id;

    @Schema(description = "卡片名")
    private String cardName;

    @Schema(description = "数据集 id")
    private Long datasetId;

    @Schema(description = "图表类型")
    private String chartType;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL})
    @EnumValue(strValues = {Status.EBL, Status.DBL})
    private String status;
}
