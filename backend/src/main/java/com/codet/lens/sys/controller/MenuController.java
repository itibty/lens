package com.codet.lens.sys.controller;

import com.codet.lens.common.auth.Permission;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.R;
import com.codet.lens.sys.SysPerms;
import com.codet.lens.sys.dto.menu.MenuTree;
import com.codet.lens.sys.dto.menu.SaveMenuRequest;
import com.codet.lens.sys.service.MenuAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "菜单")
@RestController
@RequiredArgsConstructor
public class MenuController {

    private final MenuAdminService menuAdminService;

    @Permission({SysPerms.SYS_MENU_QUERY, SysPerms.SYS_ROLE_WRITE})
    @Operation(operationId = "listMenuTree", summary = "菜单树")
    @GetMapping("/sys/menus/tree")
    public R<ListResponse<MenuTree>> listMenuTree() {
        return R.success(new ListResponse<>(menuAdminService.tree()));
    }

    @Permission(SysPerms.SYS_MENU_WRITE)
    @Operation(operationId = "editMenu", summary = "新建或编辑菜单")
    @PostMapping("/sys/menus/edit")
    public R<Long> editMenu(@Valid @RequestBody SaveMenuRequest request) {
        return R.success(menuAdminService.save(request));
    }

    @Permission(SysPerms.SYS_MENU_WRITE)
    @Operation(operationId = "delMenu", summary = "删除菜单")
    @PostMapping("/sys/menus/del")
    public R<String> delMenu(@RequestParam Long menuId) {
        menuAdminService.delete(menuId);
        return R.success();
    }
}
