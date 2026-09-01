package com.codet.lens.sys.dto.auth;

import com.codet.lens.common.base.TreeNode;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "当前菜单节点")
@Getter
@Setter
public class UserMenu extends TreeNode<UserMenu> {

    @Schema(description = "菜单名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String name;

    @Schema(description = "路由")
    private String url;

    @Schema(description = "图标")
    private String icon;
}
