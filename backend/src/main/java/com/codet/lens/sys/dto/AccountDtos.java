package com.codet.lens.sys.dto;

import com.codet.lens.common.TreeNode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Set;

public class AccountDtos {

    @Getter
    @Setter
    public static class LoginRequest {
        @NotBlank
        private String username;
        @NotBlank
        private String password;
    }

    @Getter
    @Setter
    public static class LoginResponse {
        private String token;
        private Long tokenExpireAt;
        private AccountInfo userInfo;
    }

    @Getter
    @Setter
    public static class AccountInfo {
        private Long id;
        private String username;
        private String realName;
        private String phone;
        private String email;
        private String avatar;
        private String status;
        private Set<String> roleCodes;
        private Set<String> functionCodes;
    }

    @Getter
    @Setter
    public static class ModifyPwdRequest {
        @NotBlank
        private String oldPassword;
        @NotBlank
        private String newPassword;
    }

    @Getter
    @Setter
    public static class UserMenu extends TreeNode<UserMenu> {
        @Schema(description = "菜单名")
        private String name;
        private String url;
        private String icon;
    }
}
