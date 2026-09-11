package com.codet.lens.vis.dto.subscription;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "看板邮件订阅")
@Getter
@Setter
public class DashboardSubscriptionInfo {
    private Long id;
    private Long dashboardId;
    private String dashboardName;
    private String subscriptionName;
    private String scheduleType;
    private DashboardSubscriptionSchedule schedule;
    private String timezone;
    private String channelType;
    private String recipientEmail;
    private String status;

    private Long nextFireAt;

    private Long lastFireAt;

    private String lastRunStatus;
    private String lastErrorMessage;
}
