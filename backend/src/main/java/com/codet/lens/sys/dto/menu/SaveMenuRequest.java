package com.codet.lens.sys.dto.menu;

import com.codet.lens.common.base.EnumValue;
import com.codet.lens.common.base.Status;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "新建|编辑菜单")
@Getter
@Setter
public class SaveMenuRequest {

    @Schema(description = "菜单 id。新增不传")
    private Long id;

    @Schema(description = "父菜单 id")
    private Long pid;

    @Schema(description = "菜单名", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    private String menuName;

    @Schema(description = "类型", allowableValues = {"MENU", "FUNC"}, requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank
    @EnumValue(strValues = {"MENU", "FUNC"})
    private String menuType;

    @Schema(description = "路由")
    private String routePath;

    @Schema(description = "图标")
    private String icon;

    @Schema(description = "排序")
    private Integer sortNum;

    @Schema(description = "权限码。FUNC 必填")
    private String permCode;

    @Schema(description = "状态", allowableValues = {Status.EBL, Status.DBL})
    @EnumValue(strValues = {Status.EBL, Status.DBL})
    private String status;
}
