package com.codet.lens.vis.subscription;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.subscription.DashboardSubscriptionSchedule;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import org.springframework.stereotype.Component;

@Component
public class DashboardSubscriptionScheduleCalculator {

    public long nextAfter(String type, DashboardSubscriptionSchedule schedule, String timezone, long afterEpochMs) {
        if (schedule == null || schedule.getTime() == null) {
            throw ResultException.fail("订阅频率参数不完整");
        }
        ZoneId zone = parseZone(timezone);
        LocalTime time = parseTime(schedule.getTime());
        LocalDateTime after = LocalDateTime.ofInstant(Instant.ofEpochMilli(afterEpochMs), zone);
        LocalDate date = after.toLocalDate();
        return switch (type) {
            case "DAILY" -> toEpoch(nextDaily(after, date, time), zone);
            case "WEEKDAY" -> toEpoch(nextWeekday(after, date, time), zone);
            case "WEEKLY" -> toEpoch(nextWeekly(after, date, time, requireDayOfWeek(schedule)), zone);
            case "MONTHLY" -> toEpoch(nextMonthly(after, date, time, requireDayOfMonth(schedule)), zone);
            default -> throw ResultException.fail("不支持的订阅频率");
        };
    }

    private static LocalDateTime nextDaily(LocalDateTime after, LocalDate date, LocalTime time) {
        LocalDateTime candidate = LocalDateTime.of(date, time);
        return candidate.isAfter(after) ? candidate : candidate.plusDays(1);
    }

    private static LocalDateTime nextWeekday(LocalDateTime after, LocalDate date, LocalTime time) {
        for (int i = 0; i < 8; i++) {
            LocalDate candidateDate = date.plusDays(i);
            DayOfWeek day = candidateDate.getDayOfWeek();
            if (day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY) {
                LocalDateTime candidate = LocalDateTime.of(candidateDate, time);
                if (candidate.isAfter(after)) {
                    return candidate;
                }
            }
        }
        throw ResultException.fail("无法计算下次工作日执行时间");
    }

    private static LocalDateTime nextWeekly(LocalDateTime after, LocalDate date, LocalTime time, int dayOfWeek) {
        DayOfWeek target = DayOfWeek.of(dayOfWeek);
        int distance = Math.floorMod(target.getValue() - date.getDayOfWeek().getValue(), 7);
        LocalDateTime candidate = LocalDateTime.of(date.plusDays(distance), time);
        return candidate.isAfter(after) ? candidate : candidate.plusWeeks(1);
    }

    private static LocalDateTime nextMonthly(LocalDateTime after, LocalDate date, LocalTime time, int dayOfMonth) {
        YearMonth month = YearMonth.from(date);
        LocalDateTime candidate = LocalDateTime.of(month.atDay(dayOfMonth), time);
        if (!candidate.isAfter(after)) {
            candidate = LocalDateTime.of(month.plusMonths(1).atDay(dayOfMonth), time);
        }
        return candidate;
    }

    private static long toEpoch(LocalDateTime dateTime, ZoneId zone) {
        return dateTime.atZone(zone).toInstant().toEpochMilli();
    }

    private static ZoneId parseZone(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (Exception e) {
            throw ResultException.fail("无效的时区");
        }
    }

    private static LocalTime parseTime(String time) {
        try {
            return LocalTime.parse(time);
        } catch (Exception e) {
            throw ResultException.fail("无效的发送时间");
        }
    }

    private static int requireDayOfWeek(DashboardSubscriptionSchedule schedule) {
        Integer value = schedule.getDayOfWeek();
        if (value == null || value < 1 || value > 7) {
            throw ResultException.fail("每周订阅必须选择星期");
        }
        return value;
    }

    private static int requireDayOfMonth(DashboardSubscriptionSchedule schedule) {
        Integer value = schedule.getDayOfMonth();
        if (value == null || value < 1 || value > 28) {
            throw ResultException.fail("每月订阅必须选择1到28日");
        }
        return value;
    }
}
