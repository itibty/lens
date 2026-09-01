package com.codet.lens.sys.dto.auth;

import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Set;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "当前账号")
@Getter
@Setter
public class AccountInfo {

    @Schema(description = "用户 id", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long id;

    @Schema(description = "用户名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String username;

    @Schema(description = "姓名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String realName;

    @Schema(description = "手机", requiredMode = Schema.RequiredMode.REQUIRED)
    private String phone;

    @Schema(description = "邮箱", requiredMode = Schema.RequiredMode.REQUIRED)
    private String email;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String status;

    @Schema(description = "角色编码", requiredMode = Schema.RequiredMode.REQUIRED)
    private Set<String> roleCodes;

    @Schema(description = "功能权限码", requiredMode = Schema.RequiredMode.REQUIRED)
    private Set<String> functionCodes;
}
