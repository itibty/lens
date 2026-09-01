package com.codet.lens.sys.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "用户角色")
@Getter
@Setter
public class UserRoleInfo {

    @Schema(description = "角色 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long roleId;

    @Schema(description = "角色名")
    private String roleName;

    @Schema(description = "生效开始时间，毫秒时间戳")
    private Long startAt;

    @Schema(description = "生效结束时间，毫秒时间戳")
    private Long endAt;
}
