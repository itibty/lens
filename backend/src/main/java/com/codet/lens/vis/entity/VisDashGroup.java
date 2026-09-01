package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.base.BaseEntity;
import lombok.experimental.Accessors;
import lombok.Getter;
import lombok.Setter;

@TableName("vis_dash_group")
@Getter
@Setter
@Accessors(chain = true)
public class VisDashGroup extends BaseEntity {
    private Long pid;
    private String groupName;
    private String icon;
    private Integer sortNum;
    private String status;
}
