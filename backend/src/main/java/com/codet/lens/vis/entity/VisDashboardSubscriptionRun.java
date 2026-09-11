package com.codet.lens.vis.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Getter;
import lombok.Setter;
import lombok.experimental.Accessors;

@TableName("vis_dashboard_subscription_run")
@Getter
@Setter
@Accessors(chain = true)
public class VisDashboardSubscriptionRun {
    @TableId(value = "id", type = IdType.ASSIGN_ID)
    private Long id;
    private Long subscriptionId;
    private Long scheduledAt;
    private String triggerType;
    private String runStatus;
    private Integer attemptCount;
    /** 截图大小，单位字节。 */
    private Long screenshotSize;
    private String errorMessage;
    private Long startedAt;
    private Long heartbeatAt;
    private Long finishedAt;
    private Long createAt;
    private Long createBy;
}
