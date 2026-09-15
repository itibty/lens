package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.base.BaseEntity;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@TableName("vis_dashboard_user_pref")
public class VisDashboardUserPref extends BaseEntity {
    private Long userId;
    private Long dashboardId;
    private Boolean favorite;
    private Long lastViewedAt;
    private Long defaultViewId;
}
