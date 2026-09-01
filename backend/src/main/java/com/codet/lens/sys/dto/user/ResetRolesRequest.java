package com.codet.lens.sys.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "配置用户角色")
@Getter
@Setter
public class ResetRolesRequest {

    @Schema(description = "用户 id", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    private Long userId;

    @Schema(description = "角色及生效区间")
    private List<UserRoleInfo> roleInfos;
}
