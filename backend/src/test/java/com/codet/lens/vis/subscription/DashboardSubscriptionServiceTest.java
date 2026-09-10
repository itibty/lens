package com.codet.lens.vis.subscription;

import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.auth.AuthUser;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.vis.dto.subscription.DashboardSubscriptionSchedule;
import com.codet.lens.vis.dto.subscription.SaveDashboardSubscriptionRequest;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.entity.VisDashboardSubscription;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import com.codet.lens.vis.mapper.VisDashboardSubscriptionMapper;
import com.codet.lens.vis.mapper.VisDashboardSubscriptionRunMapper;
import com.codet.lens.vis.service.VisDashboardAccess;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DashboardSubscriptionServiceTest {
    private final VisDashboardSubscriptionMapper subscriptionMapper =
            mock(VisDashboardSubscriptionMapper.class);
    private final VisDashboardSubscriptionRunMapper runMapper =
            mock(VisDashboardSubscriptionRunMapper.class);
    private final VisDashboardMapper dashboardMapper = mock(VisDashboardMapper.class);
    private final SysUserMapper userMapper = mock(SysUserMapper.class);
    private final VisDashboardAccess access = mock(VisDashboardAccess.class);
    private final DashboardSubscriptionService service = new DashboardSubscriptionService(
            subscriptionMapper,
            runMapper,
            dashboardMapper,
            userMapper,
            access,
            new DashboardSubscriptionScheduleCalculator());

    @AfterEach
    void clearAuth() {
        AuthContext.clear();
    }

    @Test
    void savesOneIndependentScheduleForCurrentUser() {
        authenticate(7L);
        SysUser user = new SysUser().setEmail("owner@example.com").setStatus(Status.EBL);
        user.setId(7L);
        VisDashboard dashboard = new VisDashboard().setDashName("经营看板").setStatus(Status.EBL);
        dashboard.setId(9L);
        when(userMapper.selectById(7L)).thenReturn(user);
        when(dashboardMapper.selectById(9L)).thenReturn(dashboard);
        SaveDashboardSubscriptionRequest request = request(9L);

        service.save(request);

        ArgumentCaptor<VisDashboardSubscription> captor =
                ArgumentCaptor.forClass(VisDashboardSubscription.class);
        verify(subscriptionMapper).insert(captor.capture());
        VisDashboardSubscription saved = captor.getValue();
        assertEquals(7L, saved.getOwnerId());
        assertEquals(9L, saved.getDashboardId());
        assertEquals("DAILY", saved.getScheduleType());
        assertEquals(Status.EBL, saved.getStatus());
        assertTrue(saved.getScheduleJson().contains("09:00"));
        assertTrue(saved.getNextFireAt() > System.currentTimeMillis());
        verify(access).assertCanView(9L);
    }

    @Test
    void doesNotExposeAnotherUsersSubscription() {
        authenticate(7L);
        VisDashboardSubscription row = new VisDashboardSubscription()
                .setOwnerId(8L)
                .setStatus(Status.EBL);
        row.setId(100L);
        when(subscriptionMapper.selectById(100L)).thenReturn(row);

        assertThrows(ResultException.class, () -> service.requireOwned(100L));
    }

    @Test
    void advancesOverdueSchedulePastNowInsteadOfFloodingMissedPeriods() {
        long now = at("2026-09-10T12:00");
        VisDashboardSubscription row = new VisDashboardSubscription()
                .setOwnerId(7L)
                .setScheduleType("DAILY")
                .setScheduleJson("{\"time\":\"09:00\"}")
                .setTimezone("Asia/Shanghai")
                .setNextFireAt(at("2026-09-01T09:00"))
                .setStatus(Status.EBL);
        row.setId(100L);

        long next = service.nextFireAfterClaim(row, now);

        assertEquals(at("2026-09-11T09:00"), next);
        assertTrue(next > now);
    }

    private static SaveDashboardSubscriptionRequest request(Long dashboardId) {
        DashboardSubscriptionSchedule schedule = new DashboardSubscriptionSchedule();
        schedule.setTime("09:00");
        SaveDashboardSubscriptionRequest request = new SaveDashboardSubscriptionRequest();
        request.setDashboardId(dashboardId);
        request.setSubscriptionName("每日经营日报");
        request.setScheduleType("DAILY");
        request.setSchedule(schedule);
        request.setTimezone("Asia/Shanghai");
        return request;
    }

    private static void authenticate(Long userId) {
        AuthContext.set(new AuthUser().setSubject(userId.toString()));
    }

    private static long at(String value) {
        return LocalDateTime.parse(value)
                .atZone(ZoneId.of("Asia/Shanghai"))
                .toInstant()
                .toEpochMilli();
    }
}
