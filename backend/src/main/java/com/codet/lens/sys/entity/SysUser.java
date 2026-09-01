package com.codet.lens.sys.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.base.BaseEntity;
import lombok.experimental.Accessors;
import lombok.Getter;
import lombok.Setter;

@TableName("sys_user")
@Getter
@Setter
@Accessors(chain = true)
public class SysUser extends BaseEntity {
    private String username;
    private String password;
    private String realName;
    private String status;
    private Long lastLoginAt;
}
