package com.codet.lens.sys.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

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
