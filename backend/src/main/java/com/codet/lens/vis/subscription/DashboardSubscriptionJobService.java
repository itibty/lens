package com.codet.lens.vis.subscription;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.common.config.LensProperties;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.entity.VisDashboardSubscription;
import com.codet.lens.vis.entity.VisDashboardSubscriptionRun;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import com.codet.lens.vis.mapper.VisDashboardSubscriptionRunMapper;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.task.TaskExecutor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardSubscriptionJobService {
    private static final int MAX_ATTEMPTS = 2;

    private final VisDashboardSubscriptionRunMapper runMapper;
    private final VisDashboardMapper dashboardMapper;
    private final DashboardSubscriptionService subscriptionService;
    private final DashboardSubscriptionOwnerService ownerService;
    private final DashboardScreenshotService screenshotService;
    private final List<DashboardSubscriptionSender> senders;
    private final TaskExecutor dashboardSubscriptionExecutor;
    private final LensProperties properties;

    public Long queueManual(VisDashboardSubscription subscription) {
        screenshotService.requireEnabled();
        sender(subscription.getChannelType()).validateAvailable();
        ownerService.prepare(subscription.getOwnerId(), subscription.getDashboardId());
        return enqueue(subscription, System.currentTimeMillis(), "MANUAL");
    }

    public void queueScheduled(DashboardSubscriptionService.DueSubscription due) {
        enqueue(due.subscription(), due.scheduledAt(), "SCHEDULED");
    }

    private Long enqueue(VisDashboardSubscription subscription, long scheduledAt, String triggerType) {
        VisDashboardSubscriptionRun run = new VisDashboardSubscriptionRun()
                .setSubscriptionId(subscription.getId())
                .setScheduledAt(scheduledAt)
                .setTriggerType(triggerType)
                .setRunStatus("RUNNING")
                .setAttemptCount(0)
                .setCreateAt(System.currentTimeMillis())
                .setCreateBy(subscription.getOwnerId());
        try {
            runMapper.insert(run);
        } catch (DuplicateKeyException duplicate) {
            log.info("dashboard subscription run already queued subscriptionId={} scheduledAt={}",
                    subscription.getId(), scheduledAt);
            return null;
        }
        try {
            boolean manual = "MANUAL".equals(triggerType);
            dashboardSubscriptionExecutor.execute(() -> execute(run.getId(), subscription.getId(), manual));
        } catch (RuntimeException e) {
            fail(run.getId(), 0, e, System.currentTimeMillis());
            throw ResultException.fail("订阅发送队列已满，请稍后重试");
        }
        return run.getId();
    }

    public void recoverStaleRuns(long now) {
        long staleAfter = Math.max(300_000L,
                properties.getSubscription().getScreenshotTimeoutMs() * (MAX_ATTEMPTS + 1L));
        runMapper.update(null, Wrappers.<VisDashboardSubscriptionRun>lambdaUpdate()
                .set(VisDashboardSubscriptionRun::getRunStatus, "FAILED")
                .set(VisDashboardSubscriptionRun::getErrorMessage, "应用中断或任务超时")
                .set(VisDashboardSubscriptionRun::getFinishedAt, now)
                .eq(VisDashboardSubscriptionRun::getRunStatus, "RUNNING")
                .lt(VisDashboardSubscriptionRun::getCreateAt, now - staleAfter));
    }

    private void execute(Long runId, Long subscriptionId, boolean manual) {
        long startedAt = System.currentTimeMillis();
        updateRun(runId, "RUNNING", 0, null, null, startedAt, null);
        VisDashboardSubscription subscription;
        DashboardSubscriptionOwnerService.OwnerSession owner;
        VisDashboard dashboard;
        try {
            subscription = manual
                    ? subscriptionService.requireExisting(subscriptionId)
                    : subscriptionService.requireActive(subscriptionId);
            dashboard = requireDashboard(subscription.getDashboardId());
            owner = ownerService.prepare(subscription.getOwnerId(), subscription.getDashboardId());
        } catch (Exception e) {
            subscriptionService.disable(subscriptionId);
            fail(runId, 0, e, startedAt);
            return;
        }

        Exception last = null;
        byte[] image = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                DashboardSubscriptionSender sender = sender(subscription.getChannelType());
                sender.validateAvailable();
                if (image == null) {
                    image = screenshotService.capture(subscription.getDashboardId(), owner.authorization());
                }
                String dashboardUrl = trimSlash(properties.getSubscription().getPublicBaseUrl())
                        + "/vis/dashboards/view?id=" + subscription.getDashboardId();
                sender.send(new DashboardSubscriptionMessage(
                        subscription.getSubscriptionName(), dashboard.getDashName(), owner.email(),
                        dashboardUrl, System.currentTimeMillis(), image));
                updateRun(runId, "SUCCESS", attempt, (long) image.length, null,
                        startedAt, System.currentTimeMillis());
                return;
            } catch (Exception e) {
                last = e;
                log.warn("dashboard subscription delivery failed subscriptionId={} runId={} attempt={} error={}",
                        subscriptionId, runId, attempt, safeError(e));
            }
        }
        fail(runId, MAX_ATTEMPTS, image == null ? null : (long) image.length, last, startedAt);
    }

    private DashboardSubscriptionSender sender(String type) {
        return senders.stream()
                .filter(candidate -> candidate.channelType().equals(type))
                .findFirst()
                .orElseThrow(() -> ResultException.fail("不支持的订阅发送渠道"));
    }

    private VisDashboard requireDashboard(Long dashboardId) {
        VisDashboard row = dashboardMapper.selectById(dashboardId);
        if (row == null || !Status.EBL.equals(row.getStatus())) {
            throw ResultException.fail("看板不存在或已禁用");
        }
        return row;
    }

    private void fail(Long runId, int attempt, Exception error, long startedAt) {
        fail(runId, attempt, null, error, startedAt);
    }

    private void fail(Long runId, int attempt, Long screenshotBytes, Exception error, long startedAt) {
        updateRun(runId, "FAILED", attempt, screenshotBytes, safeError(error),
                startedAt, System.currentTimeMillis());
    }

    private void updateRun(Long runId, String status, int attempts, Long bytes, String error,
                           Long startedAt, Long finishedAt) {
        runMapper.update(null, Wrappers.<VisDashboardSubscriptionRun>lambdaUpdate()
                .set(VisDashboardSubscriptionRun::getRunStatus, status)
                .set(VisDashboardSubscriptionRun::getAttemptCount, attempts)
                .set(VisDashboardSubscriptionRun::getScreenshotBytes, bytes)
                .set(VisDashboardSubscriptionRun::getErrorMessage, error)
                .set(VisDashboardSubscriptionRun::getStartedAt, startedAt)
                .set(VisDashboardSubscriptionRun::getFinishedAt, finishedAt)
                .eq(VisDashboardSubscriptionRun::getId, runId));
    }

    static String safeError(Exception error) {
        if (error == null) {
            return "未知错误";
        }
        String message = error.getMessage();
        String safe = message == null || message.isBlank() ? error.getClass().getSimpleName() : message;
        safe = safe.replaceAll("(?i)Bearer\\s+[A-Za-z0-9._-]+", "Bearer ***")
                .replaceAll("(?i)[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", "***@***")
                .replaceAll("[\\r\\n]+", " ");
        return safe.length() <= 500 ? safe : safe.substring(0, 500);
    }

    private static String trimSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
