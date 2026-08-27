package com.codet.lens.sys.dto;

import com.codet.lens.common.Long2DatetimeStr;
import com.codet.lens.common.PageRequest;
import com.codet.lens.common.TreeNode;
import tools.jackson.databind.annotation.JsonSerialize;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

public class SysDtos {

    @Getter
    @Setter
    public static class QueryUserRequest extends PageRequest {
        private String username;
        private String realName;
        private String status;
    }

    @Getter
    @Setter
    public static class UserInfo {
        private Long id;
        private String username;
        private String realName;
        private String status;
        @JsonSerialize(using = Long2DatetimeStr.class)
        private Long lastLoginAt;
        private String roleNames;
        private List<Long> roleIds;
        private List<UserRoleInfo> roleInfos;
    }

    @Getter
    @Setter
    public static class UserRoleInfo {
        private Long roleId;
        private String roleName;
        private Long startAt;
        private Long endAt;
    }

    @Getter
    @Setter
    public static class SaveUserRequest {
        private Long id;
        @NotBlank
        private String username;
        @NotBlank
        private String realName;
        private String status;
        private String password;
        private List<Long> roleIds;
    }

    @Getter
    @Setter
    public static class ResetRolesRequest {
        @NotNull
        private Long userId;
        private List<UserRoleInfo> roleInfos;
    }

    @Getter
    @Setter
    public static class ResetPwdRequest {
        @NotNull
        private Long userId;
        @NotBlank
        private String password;
    }

    @Getter
    @Setter
    public static class QueryRoleRequest extends PageRequest {
        private String roleName;
        private String roleCode;
        private String status;
    }

    @Getter
    @Setter
    public static class RoleInfo {
        private Long id;
        private String roleName;
        private String roleCode;
        private String roleNote;
        private String status;
        private List<Long> menuIds;
        private List<Long> dashboardIds;
    }

    @Getter
    @Setter
    public static class SaveRoleRequest {
        private Long id;
        @NotBlank
        private String roleName;
        @NotBlank
        private String roleCode;
        private String roleNote;
        private String status;
    }

    @Getter
    @Setter
    public static class ResetRoleMenusRequest {
        @NotNull
        private Long roleId;
        private List<Long> menuIds;
    }

    @Getter
    @Setter
    public static class ResetRoleDashboardsRequest {
        @NotNull
        private Long roleId;
        private List<Long> dashboardIds;
    }

    @Getter
    @Setter
    public static class SaveMenuRequest {
        private Long id;
        private Long pid;
        @NotBlank
        private String menuName;
        @NotBlank
        private String menuType;
        private String routePath;
        private String icon;
        private Integer sortNum;
        private String permCode;
        private String status;
    }

    @Getter
    @Setter
    public static class MenuTree extends TreeNode<MenuTree> {
        private String menuName;
        private String menuType;
        private String routePath;
        private String icon;
        private Integer sortNum;
        private String permCode;
        private String status;
    }
}
