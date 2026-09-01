package com.codet.lens.sys.dto.role;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "配置角色菜单")
@Getter
@Setter
public class ResetRoleMenusRequest {

    @Schema(description = "角色 id", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    private Long roleId;

    @Schema(description = "菜单 id")
    private List<Long> menuIds;
}
