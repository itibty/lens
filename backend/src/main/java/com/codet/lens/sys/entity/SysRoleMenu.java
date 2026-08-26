package com.codet.lens.sys.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@TableName("sys_role_menu")
@Getter
@Setter
@Accessors(chain = true)
public class SysRoleMenu {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long roleId;
    private Long menuId;
    private Long createAt;
    private Long createBy;
}
