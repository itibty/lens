package com.codet.lens.vis.subscription;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.subscription.DashboardSubscriptionSchedule;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class DashboardSubscriptionScheduleCalculatorTest {
    private static final ZoneId SHANGHAI = ZoneId.of("Asia/Shanghai");
    private final DashboardSubscriptionScheduleCalculator calculator =
            new DashboardSubscriptionScheduleCalculator();

    @Test
    void calculatesDailyTodayOrTomorrow() {
        DashboardSubscriptionSchedule schedule = schedule("09:00");

        assertEquals(at("2026-09-10T09:00"), calculator.nextAfter(
                "DAILY", schedule, "Asia/Shanghai", at("2026-09-10T08:00")));
        assertEquals(at("2026-09-11T09:00"), calculator.nextAfter(
                "DAILY", schedule, "Asia/Shanghai", at("2026-09-10T09:00")));
    }

    @Test
    void skipsWeekendForWeekdaySchedule() {
        assertEquals(at("2026-09-14T09:00"), calculator.nextAfter(
                "WEEKDAY", schedule("09:00"), "Asia/Shanghai", at("2026-09-11T10:00")));
    }

    @Test
    void calculatesWeeklyAndMonthlySchedules() {
        DashboardSubscriptionSchedule weekly = schedule("10:30");
        weekly.setDayOfWeek(1);
        assertEquals(at("2026-09-14T10:30"), calculator.nextAfter(
                "WEEKLY", weekly, "Asia/Shanghai", at("2026-09-10T12:00")));

        DashboardSubscriptionSchedule monthly = schedule("07:15");
        monthly.setDayOfMonth(5);
        assertEquals(at("2026-10-05T07:15"), calculator.nextAfter(
                "MONTHLY", monthly, "Asia/Shanghai", at("2026-09-10T12:00")));
    }

    @Test
    void rejectsMissingWeeklyDayAndInvalidZone() {
        assertThrows(ResultException.class, () -> calculator.nextAfter(
                "WEEKLY", schedule("09:00"), "Asia/Shanghai", at("2026-09-10T08:00")));
        assertThrows(ResultException.class, () -> calculator.nextAfter(
                "DAILY", schedule("09:00"), "Mars/Base", at("2026-09-10T08:00")));
    }

    private static DashboardSubscriptionSchedule schedule(String time) {
        DashboardSubscriptionSchedule schedule = new DashboardSubscriptionSchedule();
        schedule.setTime(time);
        return schedule;
    }

    private static long at(String value) {
        return LocalDateTime.parse(value).atZone(SHANGHAI).toInstant().toEpochMilli();
    }
}
