package com.codet.lens.sys.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@TableName("sys_user")
@Getter
@Setter
@Accessors(chain = true)
public class SysUser extends BaseEntity {
    private String username;
    private String password;
    private String realName;
    private String avatar;
    private String status;
    private Long lastLoginAt;
}
