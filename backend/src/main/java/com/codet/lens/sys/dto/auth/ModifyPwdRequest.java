package com.codet.lens.sys.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "修改密码")
@Getter
@Setter
public class ModifyPwdRequest {

    @Schema(description = "原密码", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String oldPassword;

    @Schema(description = "新密码", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String newPassword;
}
