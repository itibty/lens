package com.codet.lens.sys.dto.role;

import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "角色")
@Getter
@Setter
public class RoleInfo {

    @Schema(description = "角色 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long id;

    @Schema(description = "角色名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String roleName;

    @Schema(description = "角色编码", requiredMode = Schema.RequiredMode.REQUIRED)
    private String roleCode;

    @Schema(description = "备注")
    private String roleNote;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String status;

    @Schema(description = "菜单 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<Long> menuIds;

    @Schema(description = "看板 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<Long> dashboardIds;
}
