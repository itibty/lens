package com.codet.lens.sys.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.experimental.Accessors;
import lombok.Getter;
import lombok.Setter;

@TableName("sys_user_role")
@Getter
@Setter
@Accessors(chain = true)
public class SysUserRole {
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private Long userId;
    private Long roleId;
    private Long startAt;
    private Long endAt;
    private Long createAt;
    private Long createBy;
}
