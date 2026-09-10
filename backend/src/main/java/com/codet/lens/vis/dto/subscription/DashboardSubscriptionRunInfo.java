package com.codet.lens.vis.dto.subscription;

import com.codet.lens.common.base.Long2DatetimeStr;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.annotation.JsonSerialize;

@Getter
@Setter
public class DashboardSubscriptionRunInfo {
    private Long id;
    private Long subscriptionId;
    private String triggerType;
    private String runStatus;
    private Integer attemptCount;
    private Long screenshotBytes;
    private String errorMessage;

    @JsonSerialize(using = Long2DatetimeStr.class)
    private Long scheduledAt;

    @JsonSerialize(using = Long2DatetimeStr.class)
    private Long startedAt;

    @JsonSerialize(using = Long2DatetimeStr.class)
    private Long finishedAt;
}
