package com.codet.lens.vis.rds.bo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SqlConf {
    private Long sqlId;
    private String sqlName;
    private String sqlContent;

    private Long dsId;
    private String dsName;
    private String dsType;
}
