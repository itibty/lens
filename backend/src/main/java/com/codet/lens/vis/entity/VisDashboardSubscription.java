package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.codet.lens.common.base.BaseEntity;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@TableName("vis_dashboard_subscription")
@Getter
@Setter
@Accessors(chain = true)
public class VisDashboardSubscription extends BaseEntity {
    private Long dashboardId;
    private Long ownerId;
    private String subscriptionName;
    private String scheduleType;
    private String scheduleJson;
    private String timezone;
    private String channelType;
    private String targetJson;
    private Long nextFireAt;
    private Long lastFireAt;
    private String status;
}
