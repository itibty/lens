package com.codet.lens.vis.subscription;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.codet.lens.common.base.Status;
import com.codet.lens.common.config.LensProperties;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.entity.VisDashboardSubscription;
import com.codet.lens.vis.entity.VisDashboardSubscriptionRun;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import com.codet.lens.vis.mapper.VisDashboardSubscriptionRunMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.dao.DataAccessResourceFailureException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DashboardSubscriptionJobServiceTest {
    private final VisDashboardSubscriptionRunMapper runMapper = mock(VisDashboardSubscriptionRunMapper.class);
    private final VisDashboardMapper dashboardMapper = mock(VisDashboardMapper.class);
    private final DashboardSubscriptionService subscriptions = mock(DashboardSubscriptionService.class);
    private final DashboardSubscriptionOwnerService owners = mock(DashboardSubscriptionOwnerService.class);
    private final DashboardScreenshotService screenshots = mock(DashboardScreenshotService.class);
    private final DashboardSubscriptionSender sender = mock(DashboardSubscriptionSender.class);
    private final LensProperties properties = new LensProperties();
    private final VisDashboardSubscription subscription = new VisDashboardSubscription()
            .setDashboardId(9L).setOwnerId(7L).setChannelType("EMAIL")
            .setSubscriptionName("日报").setStatus(Status.EBL);
    private final DashboardSubscriptionOwnerService.OwnerSession owner =
            new DashboardSubscriptionOwnerService.OwnerSession("user@example.com", "Bearer test");

    @BeforeEach
    void setup() {
        new MybatisConfiguration().addMapper(VisDashboardSubscriptionRunMapper.class);
        properties.getSubscription().setEnabled(true);
        subscription.setId(100L);
        when(sender.channelType()).thenReturn("EMAIL");
        when(subscriptions.requireExisting(100L)).thenReturn(subscription);
        when(dashboardMapper.selectById(9L)).thenReturn(new VisDashboard().setDashName("看板").setStatus(Status.EBL));
        when(owners.prepare(7L, 9L)).thenReturn(owner);
        when(screenshots.capture(9L, owner.authorization())).thenReturn(new byte[]{1, 2});
        when(runMapper.update(isNull(), any(Wrapper.class))).thenReturn(1);
        when(runMapper.selectList(any(Wrapper.class))).thenReturn(List.of(run(1L)), List.of());
    }

    @Test
    void redactsCredentialsAndEmailFromRunErrors() {
        assertEquals("Bearer *** ***@*** SMTP rejected", DashboardSubscriptionJobService.safeError(
                new RuntimeException("Bearer abc.def user@example.com\nSMTP rejected")));
    }

    @Test
    void keepsManualRunQueuedWhenExecutorRejectsAndCanDispatchLater() {
        TaskExecutor executor = mock(TaskExecutor.class);
        doThrow(new TaskRejectedException("full")).doAnswer(call -> {
            ((Runnable) call.getArgument(0)).run();
            return null;
        }).when(executor).execute(any());
        when(subscriptions.queueManual(subscription)).thenReturn(1L);
        DashboardSubscriptionJobService jobs = jobs(executor);

        assertEquals(1L, jobs.queueManual(subscription));
        verify(sender, never()).send(any());
        jobs.dispatchQueued();

        verify(subscriptions, times(1)).queueManual(subscription);
        verify(sender, times(1)).send(any());
        assertTrue(statuses().contains("SUCCESS"));
    }

    @Test
    void doesNotScheduleConcurrentDrainersInSameInstance() {
        List<Runnable> tasks = new ArrayList<>();
        DashboardSubscriptionJobService jobs = jobs(tasks::add);
        jobs.dispatchQueued();
        jobs.dispatchQueued();
        assertEquals(1, tasks.size());
        tasks.getFirst().run();
        verify(sender, times(1)).send(any());
    }

    @Test
    void losingDatabaseClaimDoesNotSend() {
        when(runMapper.update(isNull(), any(Wrapper.class))).thenReturn(0);
        jobs(Runnable::run).dispatchQueued();
        verify(sender, never()).send(any());
        verify(screenshots, never()).capture(any(), any());
    }

    @Test
    void transientOwnerLookupFailureRetriesWithoutDisablingSubscription() {
        when(owners.prepare(7L, 9L)).thenThrow(new DataAccessResourceFailureException("temporary"))
                .thenReturn(owner);
        jobs(Runnable::run).dispatchQueued();
        verify(subscriptions, never()).disable(any());
        verify(sender).send(any());
        assertTrue(statuses().contains("SUCCESS"));
    }

    @Test
    void failedRunDoesNotPreventNextQueuedRunFromSending() {
        when(runMapper.selectList(any(Wrapper.class))).thenReturn(List.of(run(1L), run(2L)), List.of());
        when(owners.prepare(7L, 9L)).thenThrow(new DataAccessResourceFailureException("temporary"))
                .thenThrow(new DataAccessResourceFailureException("temporary")).thenReturn(owner);
        jobs(Runnable::run).dispatchQueued();
        assertTrue(statuses().containsAll(List.of("FAILED", "SUCCESS")));
        verify(sender, times(1)).send(any());
        verify(subscriptions, never()).disable(any());
    }

    @Test
    void knownPermissionLossDisablesSubscriptionWithoutSending() {
        when(owners.prepare(7L, 9L)).thenThrow(new DashboardSubscriptionUnavailableException("已撤权"));
        jobs(Runnable::run).dispatchQueued();
        verify(subscriptions).disable(100L);
        verify(sender, never()).send(any());
        assertTrue(statuses().contains("FAILED"));
    }

    @Test
    void skipsScheduledRunPausedDuringScreenshot() {
        doAnswer(call -> {
            subscription.setStatus(Status.DBL);
            return new byte[]{1};
        }).when(screenshots).capture(any(), any());
        jobs(Runnable::run).dispatchQueued();
        verify(sender, never()).send(any());
        verify(subscriptions, never()).disable(any());
        assertTrue(statuses().contains("SKIPPED"));
    }

    @Test
    void failedScreenshotNeverSendsAndDoesNotDisableSubscription() {
        when(screenshots.capture(any(), any())).thenThrow(new RuntimeException("卡片查询失败"));
        jobs(Runnable::run).dispatchQueued();
        verify(screenshots, times(2)).capture(any(), any());
        verify(sender, never()).send(any());
        verify(subscriptions, never()).disable(any());
        assertTrue(statuses().contains("FAILED"));
    }

    @Test
    void successfulSmtpIsNotRetriedWhenRecordingSuccessFails() {
        when(runMapper.update(isNull(), any(Wrapper.class))).thenAnswer(call -> {
            LambdaUpdateWrapper<?> wrapper = call.getArgument(1);
            if (values(wrapper).contains("SUCCESS"))
                throw new DataAccessResourceFailureException("database unavailable");
            return 1;
        });
        jobs(Runnable::run).dispatchQueued();
        verify(sender, times(1)).send(any());
    }

    @Test
    void staleRecoveryOnlyConsidersRunningHeartbeats() {
        jobs(Runnable::run).recoverStaleRuns(1_000_000L);
        ArgumentCaptor<Wrapper<VisDashboardSubscriptionRun>> captor = ArgumentCaptor.forClass(Wrapper.class);
        verify(runMapper).update(isNull(), captor.capture());
        String where = captor.getValue().getSqlSegment();
        assertTrue(where.contains("heartbeat_at"));
        assertFalse(where.contains("create_at"));
        assertTrue(values((LambdaUpdateWrapper<?>) captor.getValue()).contains("RUNNING"));
        assertFalse(values((LambdaUpdateWrapper<?>) captor.getValue()).contains("QUEUED"));
    }

    private List<Object> statuses() {
        ArgumentCaptor<Wrapper<VisDashboardSubscriptionRun>> captor = ArgumentCaptor.forClass(Wrapper.class);
        verify(runMapper, atLeastOnce()).update(isNull(), captor.capture());
        return captor.getAllValues().stream().flatMap(wrapper ->
                values((LambdaUpdateWrapper<?>) wrapper).stream()).toList();
    }

    private static List<Object> values(LambdaUpdateWrapper<?> wrapper) {
        wrapper.getSqlSegment();
        wrapper.getSqlSet();
        return new ArrayList<>(wrapper.getParamNameValuePairs().values());
    }

    private static VisDashboardSubscriptionRun run(long id) {
        return new VisDashboardSubscriptionRun().setId(id).setSubscriptionId(100L)
                .setTriggerType("SCHEDULED").setRunStatus("QUEUED");
    }

    private DashboardSubscriptionJobService jobs(TaskExecutor executor) {
        return new DashboardSubscriptionJobService(runMapper, dashboardMapper, subscriptions, owners,
                screenshots, List.of(sender), executor, properties);
    }
}
