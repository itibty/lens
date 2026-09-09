package com.codet.lens.sys.dto.role;

import com.codet.lens.common.base.PageRequest;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

public final class DashboardRelations {
    private DashboardRelations() {
    }

    @Getter
    @Setter
    @Schema(name = "DashboardRoleInfo")
    public static class RoleInfo {
        private Long id;
        private String roleName;
        private String roleCode;
        private String status;
    }

    @Getter
    @Setter
    @Schema(name = "DashboardUserRoleInfo")
    public static class UserRoleInfo extends RoleInfo {
        private Long startAt;
        private Long endAt;
        @Schema(allowableValues = {"ACTIVE", "PENDING", "EXPIRED", "DISABLED"})
        private String validity;
    }

    @Getter
    @Setter
    @Schema(name = "DashboardUserInfo")
    public static class UserInfo {
        private Long id;
        private String username;
        private String realName;
        private String status;
        private List<UserRoleInfo> roles;
    }

    @Getter
    @Setter
    @Schema(name = "QueryDashboardUsersRequest")
    public static class QueryUsers extends PageRequest {
        @NotNull
        private Long dashboardId;
        private String keyword;
    }

    @Getter
    @Setter
    @Schema(name = "UnlinkDashboardRoleRequest")
    public static class UnlinkRole {
        @NotNull
        private Long dashboardId;
        @NotNull
        private Long roleId;
    }
}
