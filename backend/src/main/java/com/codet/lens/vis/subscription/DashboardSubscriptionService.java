package com.codet.lens.vis.subscription;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.vis.dto.subscription.DashboardSubscriptionInfo;
import com.codet.lens.vis.dto.subscription.DashboardSubscriptionRunInfo;
import com.codet.lens.vis.dto.subscription.DashboardSubscriptionSchedule;
import com.codet.lens.vis.dto.subscription.SaveDashboardSubscriptionRequest;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.entity.VisDashboardSubscription;
import com.codet.lens.vis.entity.VisDashboardSubscriptionRun;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import com.codet.lens.vis.mapper.VisDashboardSubscriptionMapper;
import com.codet.lens.vis.mapper.VisDashboardSubscriptionRunMapper;
import com.codet.lens.vis.service.VisDashboardAccess;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardSubscriptionService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int MAX_DUE_BATCH = 20;

    private final VisDashboardSubscriptionMapper subscriptionMapper;
    private final VisDashboardSubscriptionRunMapper runMapper;
    private final VisDashboardMapper dashboardMapper;
    private final SysUserMapper userMapper;
    private final VisDashboardAccess dashboardAccess;
    private final DashboardSubscriptionScheduleCalculator scheduleCalculator;

    public ListResponse<DashboardSubscriptionInfo> list(Long dashboardId) {
        Long ownerId = requireCurrentUser();
        dashboardAccess.assertCanView(dashboardId);
        SysUser user = userMapper.selectById(ownerId);
        if (user == null) {
            throw ResultException.fail("用户不存在");
        }
        Map<Long, VisDashboard> dashboards = Map.of(dashboardId, requireDashboard(dashboardId));
        List<VisDashboardSubscription> rows = subscriptionMapper.selectList(
                Wrappers.<VisDashboardSubscription>lambdaQuery()
                        .eq(VisDashboardSubscription::getDashboardId, dashboardId)
                        .eq(VisDashboardSubscription::getOwnerId, ownerId)
                        .ne(VisDashboardSubscription::getStatus, Status.DEL)
                        .orderByAsc(VisDashboardSubscription::getNextFireAt)
                        .orderByDesc(VisDashboardSubscription::getId));
        return new ListResponse<>(rows.stream()
                .map(row -> toInfo(row, user.getEmail(), dashboards.get(row.getDashboardId())))
                .toList());
    }

    public ListResponse<DashboardSubscriptionRunInfo> runs(Long subscriptionId) {
        VisDashboardSubscription subscription = requireOwned(subscriptionId);
        dashboardAccess.assertCanView(subscription.getDashboardId());
        List<VisDashboardSubscriptionRun> rows = runMapper.selectList(
                Wrappers.<VisDashboardSubscriptionRun>lambdaQuery()
                        .eq(VisDashboardSubscriptionRun::getSubscriptionId, subscriptionId)
                        .orderByDesc(VisDashboardSubscriptionRun::getCreateAt)
                        .last("limit 20"));
        return new ListResponse<>(rows.stream().map(DashboardSubscriptionService::toRunInfo).toList());
    }

    @Transactional
    public Long save(SaveDashboardSubscriptionRequest request) {
        Long ownerId = requireCurrentUser();
        dashboardAccess.assertCanView(request.getDashboardId());
        requireDashboard(request.getDashboardId());
        requireEmail(ownerId);
        long now = System.currentTimeMillis();
        long next = scheduleCalculator.nextAfter(
                request.getScheduleType(), request.getSchedule(), request.getTimezone(), now);
        VisDashboardSubscription entity;
        if (request.getId() == null) {
            entity = new VisDashboardSubscription();
            entity.setOwnerId(ownerId);
            entity.setStatus(Status.EBL);
            entity.createCallback();
        } else {
            entity = requireOwned(request.getId());
            entity.modifyCallback();
        }
        entity.setDashboardId(request.getDashboardId());
        entity.setSubscriptionName(request.getSubscriptionName().trim());
        entity.setScheduleType(request.getScheduleType());
        entity.setScheduleJson(writeSchedule(request.getSchedule()));
        entity.setTimezone(request.getTimezone());
        entity.setChannelType("EMAIL");
        entity.setTargetJson("{\"ownerId\":\"" + ownerId + "\"}");
        entity.setNextFireAt(next);
        if (request.getId() == null) {
            subscriptionMapper.insert(entity);
        } else {
            subscriptionMapper.updateById(entity);
        }
        return entity.getId();
    }

    @Transactional
    public void toggle(Long subscriptionId) {
        VisDashboardSubscription row = requireOwned(subscriptionId);
        dashboardAccess.assertCanView(row.getDashboardId());
        String nextStatus = Status.EBL.equals(row.getStatus()) ? Status.DBL : Status.EBL;
        if (Status.EBL.equals(nextStatus)) {
            requireEmail(row.getOwnerId());
            row.setNextFireAt(scheduleCalculator.nextAfter(
                    row.getScheduleType(), readSchedule(row.getScheduleJson()), row.getTimezone(),
                    System.currentTimeMillis()));
        }
        row.setStatus(nextStatus);
        row.modifyCallback();
        subscriptionMapper.updateById(row);
    }

    @Transactional
    public void delete(Long subscriptionId) {
        VisDashboardSubscription row = requireOwned(subscriptionId);
        row.setStatus(Status.DEL);
        row.modifyCallback();
        subscriptionMapper.updateById(row);
    }

    public VisDashboardSubscription requireOwned(Long subscriptionId) {
        Long ownerId = requireCurrentUser();
        VisDashboardSubscription row = subscriptionMapper.selectById(subscriptionId);
        if (row == null || Status.DEL.equals(row.getStatus()) || !ownerId.equals(row.getOwnerId())) {
            throw ResultException.fail("订阅不存在");
        }
        return row;
    }

    public VisDashboardSubscription requireActive(Long subscriptionId) {
        VisDashboardSubscription row = subscriptionMapper.selectById(subscriptionId);
        if (row == null || !Status.EBL.equals(row.getStatus())) {
            throw ResultException.fail("订阅不存在或已停用");
        }
        return row;
    }

    public VisDashboardSubscription requireExisting(Long subscriptionId) {
        VisDashboardSubscription row = subscriptionMapper.selectById(subscriptionId);
        if (row == null || Status.DEL.equals(row.getStatus())) {
            throw ResultException.fail("订阅不存在");
        }
        return row;
    }

    /** 条件更新 next_fire_at 即领取；多个实例只有一个能更新成功。 */
    @Transactional
    public List<DueSubscription> claimDue(long now) {
        List<VisDashboardSubscription> due = subscriptionMapper.selectList(
                Wrappers.<VisDashboardSubscription>lambdaQuery()
                        .eq(VisDashboardSubscription::getStatus, Status.EBL)
                        .le(VisDashboardSubscription::getNextFireAt, now)
                        .orderByAsc(VisDashboardSubscription::getNextFireAt)
                        .last("limit " + MAX_DUE_BATCH));
        List<DueSubscription> claimed = new ArrayList<>();
        for (VisDashboardSubscription row : due) {
            long scheduledAt = row.getNextFireAt();
            long next;
            try {
                next = nextFireAfterClaim(row, now);
            } catch (RuntimeException e) {
                disable(row.getId());
                continue;
            }
            int updated = subscriptionMapper.update(null,
                    Wrappers.<VisDashboardSubscription>lambdaUpdate()
                            .set(VisDashboardSubscription::getNextFireAt, next)
                            .set(VisDashboardSubscription::getLastFireAt, scheduledAt)
                            .set(VisDashboardSubscription::getModifyAt, now)
                            .set(VisDashboardSubscription::getModifyBy, 0L)
                            .eq(VisDashboardSubscription::getId, row.getId())
                            .eq(VisDashboardSubscription::getStatus, Status.EBL)
                            .eq(VisDashboardSubscription::getNextFireAt, scheduledAt));
            if (updated == 1) {
                row.setNextFireAt(next);
                row.setLastFireAt(scheduledAt);
                claimed.add(new DueSubscription(row, scheduledAt));
            }
        }
        return claimed;
    }

    long nextFireAfterClaim(VisDashboardSubscription row, long now) {
        // 停机或拥塞后只补发一次，直接推进到 now 之后，避免逐周期补发形成邮件洪峰。
        return scheduleCalculator.nextAfter(
                row.getScheduleType(), readSchedule(row.getScheduleJson()), row.getTimezone(), now);
    }

    public void disable(Long subscriptionId) {
        subscriptionMapper.update(null, Wrappers.<VisDashboardSubscription>lambdaUpdate()
                .set(VisDashboardSubscription::getStatus, Status.DBL)
                .set(VisDashboardSubscription::getModifyAt, System.currentTimeMillis())
                .set(VisDashboardSubscription::getModifyBy, 0L)
                .eq(VisDashboardSubscription::getId, subscriptionId)
                .ne(VisDashboardSubscription::getStatus, Status.DEL));
    }

    public DashboardSubscriptionSchedule readSchedule(String json) {
        try {
            return JSON.readValue(json, DashboardSubscriptionSchedule.class);
        } catch (Exception e) {
            throw ResultException.fail("订阅频率配置已损坏");
        }
    }

    private DashboardSubscriptionInfo toInfo(VisDashboardSubscription row, String email, VisDashboard dashboard) {
        DashboardSubscriptionInfo info = new DashboardSubscriptionInfo();
        info.setId(row.getId());
        info.setDashboardId(row.getDashboardId());
        info.setDashboardName(dashboard == null ? null : dashboard.getDashName());
        info.setSubscriptionName(row.getSubscriptionName());
        info.setScheduleType(row.getScheduleType());
        info.setSchedule(readSchedule(row.getScheduleJson()));
        info.setTimezone(row.getTimezone());
        info.setChannelType(row.getChannelType());
        info.setRecipientEmail(email);
        info.setStatus(row.getStatus());
        info.setNextFireAt(row.getNextFireAt());
        info.setLastFireAt(row.getLastFireAt());
        VisDashboardSubscriptionRun last = runMapper.selectOne(
                Wrappers.<VisDashboardSubscriptionRun>lambdaQuery()
                        .eq(VisDashboardSubscriptionRun::getSubscriptionId, row.getId())
                        .orderByDesc(VisDashboardSubscriptionRun::getCreateAt)
                        .last("limit 1"));
        if (last != null) {
            info.setLastRunStatus(last.getRunStatus());
            info.setLastErrorMessage(last.getErrorMessage());
        }
        return info;
    }

    private static DashboardSubscriptionRunInfo toRunInfo(VisDashboardSubscriptionRun row) {
        DashboardSubscriptionRunInfo info = new DashboardSubscriptionRunInfo();
        info.setId(row.getId());
        info.setSubscriptionId(row.getSubscriptionId());
        info.setScheduledAt(row.getScheduledAt());
        info.setTriggerType(row.getTriggerType());
        info.setRunStatus(row.getRunStatus());
        info.setAttemptCount(row.getAttemptCount());
        info.setScreenshotBytes(row.getScreenshotBytes());
        info.setErrorMessage(row.getErrorMessage());
        info.setStartedAt(row.getStartedAt());
        info.setFinishedAt(row.getFinishedAt());
        return info;
    }

    private SysUser requireEmail(Long userId) {
        SysUser user = userMapper.selectById(userId);
        if (user == null || !Status.EBL.equals(user.getStatus())) {
            throw ResultException.fail("用户不存在或已禁用");
        }
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw ResultException.fail("请先绑定邮箱");
        }
        return user;
    }

    private VisDashboard requireDashboard(Long dashboardId) {
        VisDashboard row = dashboardMapper.selectById(dashboardId);
        if (row == null || Status.DEL.equals(row.getStatus())) {
            throw ResultException.fail("看板不存在");
        }
        if (!Status.EBL.equals(row.getStatus())) {
            throw ResultException.fail("看板已禁用");
        }
        return row;
    }

    private static String writeSchedule(DashboardSubscriptionSchedule schedule) {
        try {
            return JSON.writeValueAsString(schedule);
        } catch (Exception e) {
            throw ResultException.fail("无法保存订阅频率");
        }
    }

    private static Long requireCurrentUser() {
        Long userId = AuthContext.getUserIdLong();
        if (userId == null) {
            throw ResultException.fail("用户未登录");
        }
        return userId;
    }

    public record DueSubscription(VisDashboardSubscription subscription, long scheduledAt) {
    }
}
