package com.codet.lens.vis.subscription;

import com.codet.lens.common.config.LensProperties;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.anyLong;

class DashboardSubscriptionSchedulerTest {
    @Test
    void stillDispatchesCommittedRunsWhenClaimTransactionFails() {
        var subscriptions = mock(DashboardSubscriptionService.class);
        var jobs = mock(DashboardSubscriptionJobService.class);
        var properties = new LensProperties();
        properties.getSubscription().setEnabled(true);
        when(subscriptions.claimDue(anyLong())).thenThrow(new RuntimeException("transaction failed"));
        new DashboardSubscriptionScheduler(subscriptions, jobs, properties).poll();
        verify(jobs).dispatchQueued();
    }
}
