package com.codet.lens.vis.dto.card;

import com.codet.lens.common.PageRequest;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.EnumValue;
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

    @Schema(description = "状态", allowableValues = {FieldConst.EBL, FieldConst.DBL})
    @EnumValue(strValues = {FieldConst.EBL, FieldConst.DBL})
    private String status;
}
