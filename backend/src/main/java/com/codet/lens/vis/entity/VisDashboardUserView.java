package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.base.BaseEntity;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@TableName("vis_dashboard_user_view")
public class VisDashboardUserView extends BaseEntity {
    private Long userId;
    private Long dashboardId;
    private String viewName;
    private String stateJson;
    private String bindingsJson;
    private Integer revision;
}
