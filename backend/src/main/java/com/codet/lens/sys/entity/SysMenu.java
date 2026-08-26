package com.codet.lens.sys.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@TableName("sys_menu")
@Getter
@Setter
@Accessors(chain = true)
public class SysMenu extends BaseEntity {
    private Long pid;
    private String menuName;
    /** MENU | FUNC */
    private String menuType;
    private String routePath;
    private String icon;
    private Integer sortNum;
    private String permCode;
    private String status;
}
