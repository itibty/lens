package com.codet.lens.sys.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.base.BaseEntity;
import lombok.experimental.Accessors;
import lombok.Getter;
import lombok.Setter;

@TableName("sys_role")
@Getter
@Setter
@Accessors(chain = true)
public class SysRole extends BaseEntity {
    private String roleName;
    private String roleCode;
    private String roleNote;
    private String status;
}
