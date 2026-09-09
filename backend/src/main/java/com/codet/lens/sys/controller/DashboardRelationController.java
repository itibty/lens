package com.codet.lens.sys.controller;

import com.codet.lens.common.auth.Permission;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.PageResponse;
import com.codet.lens.common.base.R;
import com.codet.lens.sys.SysPerms;
import com.codet.lens.sys.dto.role.DashboardRelations.*;
import com.codet.lens.sys.service.DashboardRelationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "看板关联")
@RestController
@RequiredArgsConstructor
public class DashboardRelationController {
    private final DashboardRelationService service;

    @Permission(SysPerms.SYS_ROLE_QUERY)
    @Operation(operationId = "listDashboardRoles", summary = "看板授权角色")
    @GetMapping("/sys/dashboard-relations/roles")
    public R<ListResponse<RoleInfo>> listRoles(@RequestParam Long dashboardId) {
        return R.success(service.listRoles(dashboardId));
    }

    @Permission(SysPerms.SYS_USER_QUERY)
    @Operation(operationId = "queryDashboardUsers", summary = "看板相关用户")
    @PostMapping("/sys/dashboard-relations/users/query")
    public R<PageResponse<UserInfo>> queryUsers(@Valid @RequestBody QueryUsers request) {
        return R.success(service.queryUsers(request));
    }

    @Permission(SysPerms.SYS_ROLE_WRITE)
    @Operation(operationId = "unlinkDashboardRole", summary = "解除看板角色关联")
    @PostMapping("/sys/dashboard-relations/unlink-role")
    public R<Void> unlinkRole(@Valid @RequestBody UnlinkRole request) {
        service.unlinkRole(request);
        return R.success();
    }
}
