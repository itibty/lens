package com.codet.lens.sys.controller;

import com.codet.lens.common.auth.Permission;
import com.codet.lens.common.base.PageResponse;
import com.codet.lens.common.base.R;
import com.codet.lens.sys.SysPerms;
import com.codet.lens.sys.dto.role.QueryRoleRequest;
import com.codet.lens.sys.dto.role.ResetRoleDashboardsRequest;
import com.codet.lens.sys.dto.role.ResetRoleMenusRequest;
import com.codet.lens.sys.dto.role.RoleInfo;
import com.codet.lens.sys.dto.role.SaveRoleRequest;
import com.codet.lens.sys.service.RoleAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "角色")
@RestController
@RequiredArgsConstructor
public class RoleController {

    private final RoleAdminService roleAdminService;

    @Permission(SysPerms.SYS_ROLE_QUERY)
    @Operation(operationId = "queryRoles", summary = "分页查询角色")
    @PostMapping("/sys/roles/query")
    public R<PageResponse<RoleInfo>> queryRoles(@Valid @RequestBody QueryRoleRequest request) {
        return R.success(roleAdminService.query(request));
    }

    @Permission(SysPerms.SYS_ROLE_QUERY)
    @Operation(operationId = "getRoleDetail", summary = "角色详情")
    @GetMapping("/sys/roles/detail")
    public R<RoleInfo> getRoleDetail(@RequestParam Long roleId) {
        return R.success(roleAdminService.detail(roleId));
    }

    @Permission(SysPerms.SYS_ROLE_WRITE)
    @Operation(operationId = "addRole", summary = "新增角色")
    @PostMapping("/sys/roles/add")
    public R<Long> addRole(@Valid @RequestBody SaveRoleRequest request) {
        request.setId(null);
        return R.success(roleAdminService.save(request));
    }

    @Permission(SysPerms.SYS_ROLE_WRITE)
    @Operation(operationId = "editRole", summary = "新建或编辑角色")
    @PostMapping("/sys/roles/edit")
    public R<Long> editRole(@Valid @RequestBody SaveRoleRequest request) {
        return R.success(roleAdminService.save(request));
    }

    @Permission(SysPerms.SYS_ROLE_WRITE)
    @Operation(operationId = "toggleRoleStatus", summary = "启用或禁用角色")
    @PostMapping("/sys/roles/toggle-status")
    public R<String> toggleRoleStatus(@RequestParam Long roleId) {
        roleAdminService.toggle(roleId);
        return R.success();
    }

    @Permission(SysPerms.SYS_ROLE_WRITE)
    @Operation(operationId = "resetRoleFunctions", summary = "配置功能")
    @PostMapping("/sys/roles/reset-functions")
    public R<String> resetRoleFunctions(@Valid @RequestBody ResetRoleMenusRequest request) {
        roleAdminService.resetMenus(request);
        return R.success();
    }

    @Permission(SysPerms.SYS_ROLE_WRITE)
    @Operation(operationId = "resetRoleMenus", summary = "配置菜单")
    @PostMapping("/sys/roles/reset-menus")
    public R<String> resetRoleMenus(@Valid @RequestBody ResetRoleMenusRequest request) {
        roleAdminService.resetMenus(request);
        return R.success();
    }

    @Permission(SysPerms.SYS_ROLE_WRITE)
    @Operation(operationId = "resetRoleDashboards", summary = "配置看板")
    @PostMapping("/sys/roles/reset-dashboards")
    public R<String> resetRoleDashboards(@Valid @RequestBody ResetRoleDashboardsRequest request) {
        roleAdminService.resetDashboards(request);
        return R.success();
    }
}
