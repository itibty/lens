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

    @Schema(description = "生效开始，毫秒。页面有效期须与 endAt 成对；只传一端兼容接口/脚本")
    private Long startAt;

    @Schema(description = "生效结束，毫秒。与 startAt 成对为闭区间；两端皆空=不限期")
    private Long endAt;
}
