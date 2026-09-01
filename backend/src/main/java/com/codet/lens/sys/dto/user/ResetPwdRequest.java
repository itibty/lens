package com.codet.lens.sys.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "重置密码")
@Getter
@Setter
public class ResetPwdRequest {

    @Schema(description = "用户 id", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    private Long userId;

    @Schema(description = "新密码", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String password;
}
