package com.codet.lens.vis.subscription;

import com.codet.lens.common.config.LensProperties;
import com.codet.lens.vis.entity.VisDashboardSubscription;
import com.codet.lens.vis.entity.VisDashboardSubscriptionRun;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import com.codet.lens.vis.mapper.VisDashboardSubscriptionRunMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.TaskExecutor;
import org.springframework.dao.DuplicateKeyException;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardSubscriptionJobServiceTest {

    @Test
    void redactsCredentialsAndEmailFromRunErrors() {
        String safe = DashboardSubscriptionJobService.safeError(
                new RuntimeException("Bearer abc.def user@example.com\nSMTP rejected"));

        assertEquals("Bearer *** ***@*** SMTP rejected", safe);
    }

    @Test
    void doesNotQueueDuplicateRun() {
        VisDashboardSubscriptionRunMapper runMapper = mock(VisDashboardSubscriptionRunMapper.class);
        DashboardSubscriptionService subscriptionService = mock(DashboardSubscriptionService.class);
        DashboardSubscriptionOwnerService ownerService = mock(DashboardSubscriptionOwnerService.class);
        DashboardScreenshotService screenshotService = mock(DashboardScreenshotService.class);
        DashboardSubscriptionSender sender = mock(DashboardSubscriptionSender.class);
        TaskExecutor executor = mock(TaskExecutor.class);
        when(sender.channelType()).thenReturn("EMAIL");
        when(runMapper.insert(any(VisDashboardSubscriptionRun.class)))
                .thenThrow(new DuplicateKeyException("duplicate"));
        VisDashboardSubscription subscription = new VisDashboardSubscription()
                .setDashboardId(9L)
                .setOwnerId(7L)
                .setChannelType("EMAIL");
        subscription.setId(100L);
        DashboardSubscriptionJobService service = new DashboardSubscriptionJobService(
                runMapper,
                mock(VisDashboardMapper.class),
                subscriptionService,
                ownerService,
                screenshotService,
                java.util.List.of(sender),
                executor,
                new LensProperties());

        Long runId = service.queueManual(subscription);

        assertNull(runId);
        verify(executor, never()).execute(any());
    }
}
