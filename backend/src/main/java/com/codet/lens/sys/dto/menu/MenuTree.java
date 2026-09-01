package com.codet.lens.sys.dto.menu;

import com.codet.lens.common.base.Status;
import com.codet.lens.common.base.TreeNode;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "菜单树节点")
@Getter
@Setter
public class MenuTree extends TreeNode<MenuTree> {

    @Schema(description = "菜单名", requiredMode = Schema.RequiredMode.REQUIRED)
    private String menuName;

    @Schema(description = "类型", allowableValues = {"MENU", "FUNC"},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String menuType;

    @Schema(description = "路由")
    private String routePath;

    @Schema(description = "图标")
    private String icon;

    @Schema(description = "排序")
    private Integer sortNum;

    @Schema(description = "权限码")
    private String permCode;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL},
            requiredMode = Schema.RequiredMode.REQUIRED)
    private String status;
}
