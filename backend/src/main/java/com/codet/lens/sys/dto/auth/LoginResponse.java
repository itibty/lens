package com.codet.lens.sys.dto.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "登录结果")
@Getter
@Setter
public class LoginResponse {

    @Schema(description = "令牌，Bearer 前缀", requiredMode = Schema.RequiredMode.REQUIRED)
    private String token;

    @Schema(description = "令牌过期时间，毫秒时间戳", requiredMode = Schema.RequiredMode.REQUIRED)
    private Long tokenExpireAt;

    @Schema(description = "当前用户", requiredMode = Schema.RequiredMode.REQUIRED)
    private AccountInfo userInfo;
}
