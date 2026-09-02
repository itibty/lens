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
    /** 生效开始。页面有效期必须成对；只传一端留给接口/脚本兼容，登录仍按有值的一端过滤。 */
    private Long startAt;
    /** 生效结束。与 startAt 成对表示闭区间；两端皆空=不限期。 */
    private Long endAt;
    private Long createAt;
    private Long createBy;
}
