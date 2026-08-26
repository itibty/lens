package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

/** 看板卡片成员索引。布局在 vis_dashboard.config_json.widgets */
@TableName("vis_dashboard_card")
@Getter
@Setter
@Accessors(chain = true)
public class VisDashboardCard extends BaseEntity {

    private Long dashboardId; // 看板 id

    private Long cardId; // 卡片 id
}
