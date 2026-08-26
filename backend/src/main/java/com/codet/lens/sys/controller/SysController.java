package com.codet.lens.sys.controller;

import com.codet.lens.auth.Permission;
import com.codet.lens.auth.PublicAccess;
import com.codet.lens.common.ListResponse;
import com.codet.lens.common.PageResponse;
import com.codet.lens.common.PermCodes;
import com.codet.lens.common.R;
import com.codet.lens.common.SimpleResponse;
import com.codet.lens.sys.dto.AccountDtos.AccountInfo;
import com.codet.lens.sys.dto.AccountDtos.LoginRequest;
import com.codet.lens.sys.dto.AccountDtos.LoginResponse;
import com.codet.lens.sys.dto.AccountDtos.ModifyPwdRequest;
import com.codet.lens.sys.dto.AccountDtos.UserMenu;
import com.codet.lens.sys.dto.SysDtos.MenuTree;
import com.codet.lens.sys.dto.SysDtos.QueryRoleRequest;
import com.codet.lens.sys.dto.SysDtos.QueryUserRequest;
import com.codet.lens.sys.dto.SysDtos.ResetPwdRequest;
import com.codet.lens.sys.dto.SysDtos.ResetRoleDashboardsRequest;
import com.codet.lens.sys.dto.SysDtos.ResetRoleMenusRequest;
import com.codet.lens.sys.dto.SysDtos.ResetRolesRequest;
import com.codet.lens.sys.dto.SysDtos.RoleInfo;
import com.codet.lens.sys.dto.SysDtos.SaveMenuRequest;
import com.codet.lens.sys.dto.SysDtos.SaveRoleRequest;
import com.codet.lens.sys.dto.SysDtos.SaveUserRequest;
import com.codet.lens.sys.dto.SysDtos.UserInfo;
import com.codet.lens.sys.service.AccountService;
import com.codet.lens.sys.service.MenuAdminService;
import com.codet.lens.sys.service.RoleAdminService;
import com.codet.lens.sys.service.UserAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class SysController {

    private final AccountService accountService;
    private final UserAdminService userAdminService;
    private final RoleAdminService roleAdminService;
    private final MenuAdminService menuAdminService;

    @PublicAccess
    @Tag(name = "认证")
    @Operation(operationId = "loginAccount", summary = "登录")
    @PostMapping("/auth/login")
    public R<LoginResponse> loginAccount(@Valid @RequestBody LoginRequest request) {
        return R.success(accountService.login(request));
    }

    @Tag(name = "认证")
    @Operation(operationId = "logoutAccount", summary = "退出")
    @PostMapping("/auth/logout")
    public R<String> logoutAccount() {
        return R.success();
    }

    @Tag(name = "认证")
    @Operation(operationId = "getAccountInfo", summary = "当前用户")
    @GetMapping("/auth/me")
    public R<SimpleResponse<AccountInfo>> getAccountInfo() {
        return R.success(accountService.current());
    }

    @Tag(name = "认证")
    @Operation(operationId = "listAccountMenus", summary = "当前菜单")
    @GetMapping("/auth/menus")
    public R<ListResponse<UserMenu>> listAccountMenus() {
        return R.success(accountService.menus());
    }

    @Tag(name = "认证")
    @Operation(operationId = "modifyAccountPwd", summary = "修改密码")
    @PostMapping("/auth/password")
    public R<String> modifyAccountPwd(@Valid @RequestBody ModifyPwdRequest request) {
        accountService.modifyPassword(request);
        return R.success();
    }

    @Tag(name = "用户")
    @Permission(PermCodes.SYS_USER_QUERY)
    @Operation(operationId = "queryUsers", summary = "分页查询用户")
    @PostMapping("/sys/users/query")
    public R<PageResponse<UserInfo>> queryUsers(@Valid @RequestBody QueryUserRequest request) {
        return R.success(userAdminService.query(request));
    }

    @Tag(name = "用户")
    @Permission(PermCodes.SYS_USER_WRITE)
    @Operation(operationId = "addUser", summary = "新增用户")
    @PostMapping("/sys/users/add")
    public R<Long> addUser(@Valid @RequestBody SaveUserRequest request) {
        request.setId(null);
        return R.success(userAdminService.save(request));
    }

    @Tag(name = "用户")
    @Permission(PermCodes.SYS_USER_WRITE)
    @Operation(operationId = "editUser", summary = "新建或编辑用户")
    @PostMapping("/sys/users/edit")
    public R<Long> editUser(@Valid @RequestBody SaveUserRequest request) {
        return R.success(userAdminService.save(request));
    }

    @Tag(name = "用户")
    @Permission(PermCodes.SYS_USER_WRITE)
    @Operation(operationId = "toggleUserStatus", summary = "启用或禁用用户")
    @PostMapping("/sys/users/toggle-status")
    public R<String> toggleUserStatus(@RequestParam Long userId) {
        userAdminService.toggle(userId);
        return R.success();
    }

    @Tag(name = "用户")
    @Permission(PermCodes.SYS_USER_CONFIG_ROLE)
    @Operation(operationId = "resetUserRoles", summary = "配置角色")
    @PostMapping("/sys/users/reset-roles")
    public R<String> resetUserRoles(@Valid @RequestBody ResetRolesRequest request) {
        userAdminService.resetRoles(request);
        return R.success();
    }

    @Tag(name = "用户")
    @Permission(PermCodes.SYS_USER_PWD)
    @Operation(operationId = "resetUserPwd", summary = "重置密码")
    @PostMapping("/sys/users/reset-pwd")
    public R<String> resetUserPwd(@Valid @RequestBody ResetPwdRequest request) {
        userAdminService.resetPwd(request);
        return R.success();
    }

    @Tag(name = "角色")
    @Permission(PermCodes.SYS_ROLE_QUERY)
    @Operation(operationId = "queryRoles", summary = "分页查询角色")
    @PostMapping("/sys/roles/query")
    public R<PageResponse<RoleInfo>> queryRoles(@Valid @RequestBody QueryRoleRequest request) {
        return R.success(roleAdminService.query(request));
    }

    @Tag(name = "角色")
    @Permission(PermCodes.SYS_ROLE_QUERY)
    @Operation(operationId = "getRoleDetail", summary = "角色详情")
    @GetMapping("/sys/roles/detail")
    public R<RoleInfo> getRoleDetail(@RequestParam Long roleId) {
        return R.success(roleAdminService.detail(roleId));
    }

    @Tag(name = "角色")
    @Permission(PermCodes.SYS_ROLE_WRITE)
    @Operation(operationId = "addRole", summary = "新增角色")
    @PostMapping("/sys/roles/add")
    public R<Long> addRole(@Valid @RequestBody SaveRoleRequest request) {
        request.setId(null);
        return R.success(roleAdminService.save(request));
    }

    @Tag(name = "角色")
    @Permission(PermCodes.SYS_ROLE_WRITE)
    @Operation(operationId = "editRole", summary = "新建或编辑角色")
    @PostMapping("/sys/roles/edit")
    public R<Long> editRole(@Valid @RequestBody SaveRoleRequest request) {
        return R.success(roleAdminService.save(request));
    }

    @Tag(name = "角色")
    @Permission(PermCodes.SYS_ROLE_WRITE)
    @Operation(operationId = "toggleRoleStatus", summary = "启用或禁用角色")
    @PostMapping("/sys/roles/toggle-status")
    public R<String> toggleRoleStatus(@RequestParam Long roleId) {
        roleAdminService.toggle(roleId);
        return R.success();
    }

    @Tag(name = "角色")
    @Permission(PermCodes.SYS_ROLE_CONFIG_MENU)
    @Operation(operationId = "resetRoleFunctions", summary = "配置功能")
    @PostMapping("/sys/roles/reset-functions")
    public R<String> resetRoleFunctions(@Valid @RequestBody ResetRoleMenusRequest request) {
        roleAdminService.resetMenus(request);
        return R.success();
    }

    @Tag(name = "角色")
    @Permission(PermCodes.SYS_ROLE_CONFIG_MENU)
    @Operation(operationId = "resetRoleMenus", summary = "配置菜单")
    @PostMapping("/sys/roles/reset-menus")
    public R<String> resetRoleMenus(@Valid @RequestBody ResetRoleMenusRequest request) {
        roleAdminService.resetMenus(request);
        return R.success();
    }

    @Tag(name = "角色")
    @Permission(PermCodes.SYS_ROLE_CONFIG_DASHBOARD)
    @Operation(operationId = "resetRoleDashboards", summary = "配置看板")
    @PostMapping("/sys/roles/reset-dashboards")
    public R<String> resetRoleDashboards(@Valid @RequestBody ResetRoleDashboardsRequest request) {
        roleAdminService.resetDashboards(request);
        return R.success();
    }

    @Tag(name = "菜单")
    @Permission({PermCodes.SYS_MENU_QUERY, PermCodes.SYS_ROLE_CONFIG_MENU})
    @Operation(operationId = "listMenuTree", summary = "菜单树")
    @GetMapping("/sys/menus/tree")
    public R<ListResponse<MenuTree>> listMenuTree() {
        return R.success(new ListResponse<>(menuAdminService.tree()));
    }

    @Tag(name = "菜单")
    @Permission(PermCodes.SYS_MENU_WRITE)
    @Operation(operationId = "editMenu", summary = "新建或编辑菜单")
    @PostMapping("/sys/menus/edit")
    public R<Long> editMenu(@Valid @RequestBody SaveMenuRequest request) {
        return R.success(menuAdminService.save(request));
    }

    @Tag(name = "菜单")
    @Permission(PermCodes.SYS_MENU_WRITE)
    @Operation(operationId = "delMenu", summary = "删除菜单")
    @PostMapping("/sys/menus/del")
    public R<String> delMenu(@RequestParam Long menuId) {
        menuAdminService.delete(menuId);
        return R.success();
    }
}
