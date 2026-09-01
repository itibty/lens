package com.codet.lens.sys.dto.role;

import com.codet.lens.common.base.EnumValue;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "新建|编辑角色")
@Getter
@Setter
public class SaveRoleRequest {

    @Schema(description = "角色 id。新增不传")
    private Long id;

    @Schema(description = "角色名", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String roleName;

    @Schema(description = "角色编码", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String roleCode;

    @Schema(description = "备注")
    private String roleNote;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL})
    @EnumValue(strValues = {Status.EBL, Status.DBL})
    private String status;
}
