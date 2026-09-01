package com.codet.lens.sys.dto.role;

import com.codet.lens.common.base.EnumValue;
import com.codet.lens.common.base.PageRequest;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "分页查询角色")
@Getter
@Setter
public class QueryRoleRequest extends PageRequest {

    @Schema(description = "角色名")
    private String roleName;

    @Schema(description = "角色编码")
    private String roleCode;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL})
    @EnumValue(strValues = {Status.EBL, Status.DBL})
    private String status;
}
