package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

/** 可视化看板 */
@TableName("vis_dashboard")
@Getter
@Setter
@Accessors(chain = true)
public class VisDashboard extends BaseEntity {

    private Long groupId;

    private String dashName; // 看板名

    private String dashDesc; // 描述

    private String configJson; // 看板配置

    private String status; // 状态
}
