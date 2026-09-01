package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.base.BaseEntity;
import lombok.experimental.Accessors;
import lombok.Getter;
import lombok.Setter;

@TableName("vis_datasource")
@Getter
@Setter
@Accessors(chain = true)
public class VisDatasource extends BaseEntity {
    private String sourceName;
    private String dbType;
    private String jdbcUrl;
    private String username;
    private String password;
    private String status;
}
