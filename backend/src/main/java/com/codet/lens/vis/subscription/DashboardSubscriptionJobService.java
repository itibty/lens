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
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardSubscriptionJobService {
    private static final int MAX_ATTEMPTS = 2;
    private static final long STALE_AFTER_MS = 300_000L;

    private final VisDashboardSubscriptionRunMapper runMapper;
    private final VisDashboardMapper dashboardMapper;
    private final DashboardSubscriptionService subscriptionService;
    private final DashboardSubscriptionOwnerService ownerService;
    private final DashboardScreenshotService screenshotService;
    private final List<DashboardSubscriptionSender> senders;
    private final TaskExecutor dashboardSubscriptionExecutor;
    private final LensProperties properties;
    private final AtomicBoolean draining = new AtomicBoolean();
    private final AtomicReference<Long> activeRun = new AtomicReference<>();

    public Long queueManual(VisDashboardSubscription subscription) {
        screenshotService.requireEnabled();
        sender(subscription.getChannelType()).validateAvailable();
        ownerService.prepare(subscription.getOwnerId(), subscription.getDashboardId());
        // 独立事务已提交后再唤醒工作线程；拒绝执行或重启都不会丢失数据库中的任务。
        Long runId = subscriptionService.queueManual(subscription);
        dispatchQueued();
        return runId;
    }

    public void dispatchQueued() {
        if (!properties.getSubscription().isEnabled() || !draining.compareAndSet(false, true)) {
            return;
        }
        try {
            dashboardSubscriptionExecutor.execute(() -> {
                try {
                    drainQueue();
                } catch (Exception e) {
                    log.warn("dashboard subscription worker failed: {}", safeError(e));
                } finally {
                    draining.set(false);
                }
            });
        } catch (RuntimeException e) {
            draining.set(false);
            log.warn("dashboard subscription worker unavailable; queued runs retained: {}", safeError(e));
        }
    }

    private void drainQueue() {
        while (properties.getSubscription().isEnabled() && !Thread.currentThread().isInterrupted()) {
            List<VisDashboardSubscriptionRun> queued = runMapper.selectList(
                    Wrappers.<VisDashboardSubscriptionRun>lambdaQuery()
                            .eq(VisDashboardSubscriptionRun::getRunStatus, "QUEUED")
                            .orderByAsc(VisDashboardSubscriptionRun::getCreateAt)
                            .orderByAsc(VisDashboardSubscriptionRun::getId)
                            .last("limit 20"));
            if (queued.isEmpty()) {
                return;
            }
            for (VisDashboardSubscriptionRun run : queued) {
                if (!properties.getSubscription().isEnabled() || Thread.currentThread().isInterrupted()) {
                    return;
                }
                long startedAt = System.currentTimeMillis();
                int claimed = runMapper.update(null, Wrappers.<VisDashboardSubscriptionRun>lambdaUpdate()
                        .set(VisDashboardSubscriptionRun::getRunStatus, "RUNNING")
                        .set(VisDashboardSubscriptionRun::getStartedAt, startedAt)
                        .set(VisDashboardSubscriptionRun::getHeartbeatAt, startedAt)
                        .eq(VisDashboardSubscriptionRun::getId, run.getId())
                        .eq(VisDashboardSubscriptionRun::getRunStatus, "QUEUED"));
                if (claimed != 1) {
                    continue;
                }
                activeRun.set(run.getId());
                try {
                    execute(run);
                } catch (Exception e) {
                    // 数据库异常等不能终止整批；未能落库的 RUNNING 由心跳恢复逻辑处理。
                    log.warn("dashboard subscription run interrupted runId={} error={}", run.getId(), safeError(e));
                } finally {
                    activeRun.compareAndSet(run.getId(), null);
                }
            }
        }
    }

    public void heartbeat() {
        Long runId = activeRun.get();
        if (runId != null) {
            touch(runId);
        }
    }

    public void recoverStaleRuns(long now) {
        runMapper.update(null, Wrappers.<VisDashboardSubscriptionRun>lambdaUpdate()
                .set(VisDashboardSubscriptionRun::getRunStatus, "FAILED")
                .set(VisDashboardSubscriptionRun::getErrorMessage, "应用中断，发送结果可能未确认，请检查邮箱后再测试")
                .set(VisDashboardSubscriptionRun::getFinishedAt, now)
                .eq(VisDashboardSubscriptionRun::getRunStatus, "RUNNING")
                .lt(VisDashboardSubscriptionRun::getHeartbeatAt, now - STALE_AFTER_MS));
    }

    private boolean touch(Long runId) {
        return runMapper.update(null, Wrappers.<VisDashboardSubscriptionRun>lambdaUpdate()
                .set(VisDashboardSubscriptionRun::getHeartbeatAt, System.currentTimeMillis())
                .eq(VisDashboardSubscriptionRun::getId, runId)
                .eq(VisDashboardSubscriptionRun::getRunStatus, "RUNNING")) == 1;
    }

    private void execute(VisDashboardSubscriptionRun run) {
        Long subscriptionId = run.getSubscriptionId();
        Long bytes = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            boolean delivered = false;
            try {
                if (!touch(run.getId())) {
                    return;
                }
                VisDashboardSubscription subscription = availableSubscription(run);
                if (subscription == null) {
                    return;
                }
                requireDashboard(subscription.getDashboardId());
                DashboardSubscriptionOwnerService.OwnerSession owner = ownerService.prepare(
                        subscription.getOwnerId(), subscription.getDashboardId());
                DashboardSubscriptionSender sender = sender(subscription.getChannelType());
                sender.validateAvailable();
                byte[] image = screenshotService.capture(subscription.getDashboardId(), owner.authorization());
                bytes = (long) image.length;
                // 截图期间可能停用、删除、改邮箱或撤权；发送前再次检查。
                VisDashboardSubscription current = availableSubscription(run);
                if (current == null) {
                    return;
                }
                if (!current.getDashboardId().equals(subscription.getDashboardId())) {
                    throw ResultException.fail("订阅看板已变更，请重新生成截图");
                }
                VisDashboard dashboard = requireDashboard(current.getDashboardId());
                owner = ownerService.prepare(current.getOwnerId(), current.getDashboardId());
                if (!touch(run.getId()) || Thread.currentThread().isInterrupted()) {
                    return;
                }
                String dashboardUrl = trimSlash(properties.getSubscription().getPublicBaseUrl())
                        + "/vis/dashboards/view?id=" + current.getDashboardId();
                sender.send(new DashboardSubscriptionMessage(
                        current.getSubscriptionName(), dashboard.getDashName(), owner.email(),
                        dashboardUrl, System.currentTimeMillis(), image));
                delivered = true;
                finish(run.getId(), "SUCCESS", attempt, bytes, null);
                return;
            } catch (DashboardSubscriptionUnavailableException e) {
                subscriptionService.disable(subscriptionId);
                finish(run.getId(), "FAILED", attempt, bytes, safeError(e));
                return;
            } catch (Exception e) {
                // SMTP 已成功返回后，状态写入失败不能再次发邮件。
                if (delivered) {
                    throw e;
                }
                log.warn("dashboard subscription delivery failed subscriptionId={} runId={} attempt={} error={}",
                        subscriptionId, run.getId(), attempt, safeError(e));
                if (attempt == MAX_ATTEMPTS) {
                    finish(run.getId(), "FAILED", attempt, bytes, safeError(e));
                }
            }
        }
    }

    private VisDashboardSubscription availableSubscription(VisDashboardSubscriptionRun run) {
        VisDashboardSubscription subscription;
        try {
            subscription = subscriptionService.requireExisting(run.getSubscriptionId());
        } catch (ResultException e) {
            finish(run.getId(), "SKIPPED", 0, null, safeError(e));
            return null;
        }
        if ("SCHEDULED".equals(run.getTriggerType()) && !Status.EBL.equals(subscription.getStatus())) {
            finish(run.getId(), "SKIPPED", 0, null, "订阅已停用");
            return null;
        }
        return subscription;
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
            throw new DashboardSubscriptionUnavailableException("看板不存在或已禁用");
        }
        return row;
    }

    private void finish(Long runId, String status, int attempts, Long bytes, String error) {
        runMapper.update(null, Wrappers.<VisDashboardSubscriptionRun>lambdaUpdate()
                .set(VisDashboardSubscriptionRun::getRunStatus, status)
                .set(VisDashboardSubscriptionRun::getAttemptCount, attempts)
                .set(VisDashboardSubscriptionRun::getScreenshotSize, bytes)
                .set(VisDashboardSubscriptionRun::getErrorMessage, error)
                .set(VisDashboardSubscriptionRun::getFinishedAt, System.currentTimeMillis())
                .eq(VisDashboardSubscriptionRun::getId, runId)
                .eq(VisDashboardSubscriptionRun::getRunStatus, "RUNNING"));
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
