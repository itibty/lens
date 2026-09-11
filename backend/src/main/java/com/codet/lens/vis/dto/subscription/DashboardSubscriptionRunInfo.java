package com.codet.lens.vis.dto.subscription;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DashboardSubscriptionRunInfo {
    private Long id;
    private Long subscriptionId;
    private String triggerType;
    private String runStatus;
    private Integer attemptCount;
    @Schema(description = "截图大小，单位字节")
    private Long screenshotSize;
    private String errorMessage;

    private Long scheduledAt;

    private Long startedAt;

    private Long finishedAt;
}
