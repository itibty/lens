package com.codet.lens.vis.dto.subscription;

import com.codet.lens.common.base.Long2DatetimeStr;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.annotation.JsonSerialize;

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

    @JsonSerialize(using = Long2DatetimeStr.class)
    private Long nextFireAt;

    @JsonSerialize(using = Long2DatetimeStr.class)
    private Long lastFireAt;

    private String lastRunStatus;
    private String lastErrorMessage;
}
