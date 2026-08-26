package com.codet.lens.vis.rds.bo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SqlConf {
    private Long sqlId;
    private String sqlName;
    private String sqlType;  // sql类型：DQL | DML
    private String sqlContent;
    private String retKey;

    // 数据源
    private Long dsId;
    private String dsName;
    private String dsType;

    // 权限
    private String execRoles; // 可执行的角色编码集合，留空不限制角色
    private String execUsers; // 可执行的用户id集合，留空不限制用户
}
