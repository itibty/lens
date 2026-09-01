package com.codet.lens.sys.controller;

import com.codet.lens.common.auth.Permission;
import com.codet.lens.common.base.PageResponse;
import com.codet.lens.common.base.R;
import com.codet.lens.sys.SysPerms;
import com.codet.lens.sys.dto.user.QueryUserRequest;
import com.codet.lens.sys.dto.user.ResetPwdRequest;
import com.codet.lens.sys.dto.user.ResetRolesRequest;
import com.codet.lens.sys.dto.user.SaveUserRequest;
import com.codet.lens.sys.dto.user.UserInfo;
import com.codet.lens.sys.service.UserAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "用户")
@RestController
@RequiredArgsConstructor
public class UserController {

    private final UserAdminService userAdminService;

    @Permission(SysPerms.SYS_USER_QUERY)
    @Operation(operationId = "queryUsers", summary = "分页查询用户")
    @PostMapping("/sys/users/query")
    public R<PageResponse<UserInfo>> queryUsers(@Valid @RequestBody QueryUserRequest request) {
        return R.success(userAdminService.query(request));
    }

    @Permission(SysPerms.SYS_USER_WRITE)
    @Operation(operationId = "addUser", summary = "新增用户")
    @PostMapping("/sys/users/add")
    public R<Long> addUser(@Valid @RequestBody SaveUserRequest request) {
        request.setId(null);
        return R.success(userAdminService.save(request));
    }

    @Permission(SysPerms.SYS_USER_WRITE)
    @Operation(operationId = "editUser", summary = "新建或编辑用户")
    @PostMapping("/sys/users/edit")
    public R<Long> editUser(@Valid @RequestBody SaveUserRequest request) {
        return R.success(userAdminService.save(request));
    }

    @Permission(SysPerms.SYS_USER_WRITE)
    @Operation(operationId = "toggleUserStatus", summary = "启用或禁用用户")
    @PostMapping("/sys/users/toggle-status")
    public R<String> toggleUserStatus(@RequestParam Long userId) {
        userAdminService.toggle(userId);
        return R.success();
    }

    @Permission(SysPerms.SYS_USER_WRITE)
    @Operation(operationId = "resetUserRoles", summary = "配置角色")
    @PostMapping("/sys/users/reset-roles")
    public R<String> resetUserRoles(@Valid @RequestBody ResetRolesRequest request) {
        userAdminService.resetRoles(request);
        return R.success();
    }

    @Permission(SysPerms.SYS_USER_WRITE)
    @Operation(operationId = "resetUserPwd", summary = "重置密码")
    @PostMapping("/sys/users/reset-pwd")
    public R<String> resetUserPwd(@Valid @RequestBody ResetPwdRequest request) {
        userAdminService.resetPwd(request);
        return R.success();
    }
}
