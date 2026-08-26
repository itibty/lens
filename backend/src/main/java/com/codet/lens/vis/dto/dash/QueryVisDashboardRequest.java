package com.codet.lens.vis.dto.dash;

import com.codet.lens.common.PageRequest;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.EnumValue;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "看板分页查询")
@Getter
@Setter
public class QueryVisDashboardRequest extends PageRequest {

    @Schema(description = "看板 id")
    private Long id;

    @Schema(description = "分组 id。0 为未分组")
    private Long groupId;

    @Schema(description = "groupId 非 0 时是否包含子孙分组。默认 true；抽屉精确查询传 false")
    private Boolean includeDescendants;

    @Schema(description = "看板名")
    private String dashName;

    @Schema(description = "状态", allowableValues = {FieldConst.EBL, FieldConst.DBL})
    @EnumValue(strValues = {FieldConst.EBL, FieldConst.DBL})
    private String status;
}
