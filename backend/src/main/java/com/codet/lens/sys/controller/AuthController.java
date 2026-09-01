package com.codet.lens.sys.controller;

import com.codet.lens.common.auth.PublicAccess;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.R;
import com.codet.lens.common.base.SimpleResponse;
import com.codet.lens.sys.dto.auth.AccountInfo;
import com.codet.lens.sys.dto.auth.LoginRequest;
import com.codet.lens.sys.dto.auth.LoginResponse;
import com.codet.lens.sys.dto.auth.ModifyPwdRequest;
import com.codet.lens.sys.dto.auth.UserMenu;
import com.codet.lens.sys.service.AccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "认证")
@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AccountService accountService;

    @PublicAccess
    @Operation(operationId = "loginAccount", summary = "登录")
    @PostMapping("/auth/login")
    public R<LoginResponse> loginAccount(@Valid @RequestBody LoginRequest request) {
        return R.success(accountService.login(request));
    }

    @Operation(operationId = "logoutAccount", summary = "退出")
    @PostMapping("/auth/logout")
    public R<String> logoutAccount() {
        accountService.logout();
        return R.success();
    }

    @Operation(operationId = "getAccountInfo", summary = "当前用户")
    @GetMapping("/auth/me")
    public R<SimpleResponse<AccountInfo>> getAccountInfo() {
        return R.success(accountService.current());
    }

    @Operation(operationId = "listAccountMenus", summary = "当前菜单")
    @GetMapping("/auth/menus")
    public R<ListResponse<UserMenu>> listAccountMenus() {
        return R.success(accountService.menus());
    }

    @Operation(operationId = "modifyAccountPwd", summary = "修改密码")
    @PostMapping("/auth/password")
    public R<String> modifyAccountPwd(@Valid @RequestBody ModifyPwdRequest request) {
        accountService.modifyPassword(request);
        return R.success();
    }
}
