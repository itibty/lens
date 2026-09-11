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

    @Scheduled(fixedDelay = 30_000)
    public void heartbeat() {
        try {
            jobService.heartbeat();
        } catch (Exception e) {
            log.warn("dashboard subscription heartbeat failed: {}", DashboardSubscriptionJobService.safeError(e));
        }
    }

    @Scheduled(fixedDelayString = "${lens.subscription.poll-interval-ms:30000}")
    public void poll() {
        if (!properties.getSubscription().isEnabled()) {
            return;
        }
        try {
            jobService.recoverStaleRuns(System.currentTimeMillis());
        } catch (Exception e) {
            log.warn("dashboard subscription recovery failed: {}", DashboardSubscriptionJobService.safeError(e));
        }
        try {
            subscriptionService.claimDue(System.currentTimeMillis());
        } catch (Exception e) {
            log.warn("dashboard subscription claim failed: {}", DashboardSubscriptionJobService.safeError(e));
        }
        // 领取失败不妨碍先前已提交的任务；重启后也从这里继续消费。
        jobService.dispatchQueued();
    }
}
