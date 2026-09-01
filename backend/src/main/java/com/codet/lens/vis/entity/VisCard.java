package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.base.BaseEntity;
import lombok.experimental.Accessors;
import lombok.Getter;
import lombok.Setter;

/** 可视化卡片 */
@TableName("vis_card")
@Getter
@Setter
@Accessors(chain = true)
public class VisCard extends BaseEntity {

    private String cardName; // 卡片名

    private String cardDesc; // 卡片描述

    private Long datasetId; // 数据集 id

    private String chartType; // 图表类型

    private String queryJson; // 查询配置

    private String visualJson; // 可视化配置

    private String status; // 状态
}
