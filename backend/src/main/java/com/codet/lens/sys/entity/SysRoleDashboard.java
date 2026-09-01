package com.codet.lens.sys.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.experimental.Accessors;
import lombok.Getter;
import lombok.Setter;

@TableName("sys_role_dashboard")
@Getter
@Setter
@Accessors(chain = true)
public class SysRoleDashboard {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long roleId;
    private Long dashboardId;
    private Long createAt;
    private Long createBy;
}
