package com.codet.lens.vis.subscription;

import com.codet.lens.common.config.LensProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DashboardSubscriptionScheduler {
    private final DashboardSubscriptionService subscriptionService;
    private final DashboardSubscriptionJobService jobService;
    private final LensProperties properties;

    @Scheduled(fixedDelayString = "${lens.subscription.poll-interval-ms:30000}")
    public void poll() {
        if (!properties.getSubscription().isEnabled()) {
            return;
        }
        try {
            jobService.recoverStaleRuns(System.currentTimeMillis());
            for (DashboardSubscriptionService.DueSubscription due
                    : subscriptionService.claimDue(System.currentTimeMillis())) {
                jobService.queueScheduled(due);
            }
        } catch (Exception e) {
            log.warn("dashboard subscription poll failed", e);
        }
    }
}
