package com.codet.lens.vis.core.query;

import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.base.ResultEnum;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.enums.DateValueExpEnum;
import java.time.DayOfWeek;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * 将 {@code valueExp} 展开为日历闭区间 {@code [start, end]}（yyyy-MM-dd），两端含当天。
 * {@code current_week}/{@code current_month}/{@code current_year} 的 end 是 asOfDate，不是周日/月末/年末。
 * SQL 绑定请用 {@link #toHalfOpenDateTime}：{@code >= start 00:00:00 AND < end+1 00:00:00}，
 * 半开上界在 asOfDate 次日 0 点，DATE / DATETIME（含小数秒）都能包住末日。Enjoy 仍用闭区间两个日期。
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class DateValueExpResolver {

    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static String[] resolve(String valueExp, Object[] value) {
        return resolve(valueExp, value, LocalDate.now());
    }

    /**
     * @return {@code [start, end]}，均为 yyyy-MM-dd，两端包含
     */
    public static String[] resolve(String valueExp, Object[] value, LocalDate today) {
        if (today == null) {
            throw fail("today 不能为空");
        }
        DateValueExpEnum exp = parseExp(valueExp);
        validateValueCount(exp, value);

        LocalDate start;
        LocalDate end;
        switch (exp) {
            case CURRENT_DAY:
                start = today;
                end = today;
                break;
            case LAST_DAY:
                start = today.minusDays(1);
                end = start;
                break;
            case LAST_DAYS: {
                int n = toInt(value[0], "last_days.N");
                if (n < 1) {
                    throw fail("last_days 的 N 必须 >= 1");
                }
                start = today.minusDays(n - 1L);
                end = today;
                break;
            }
            case LAST_XY_DAYS: {
                int x = toInt(value[0], "last_xy_days.X");
                int y = toInt(value[1], "last_xy_days.Y");
                if (x < 1 || y < 0 || x <= y) {
                    throw fail("last_xy_days 需要 2 个值 [X, Y]：X > Y，X >= 1，Y >= 0（前大后小）");
                }
                start = today.minusDays(x);
                end = today.minusDays(y);
                break;
            }
            case CURRENT_WEEK:
                start = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                end = today;
                break;
            case LAST_WEEK: {
                LocalDate thisMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                start = thisMonday.minusWeeks(1);
                end = start.plusDays(6);
                break;
            }
            case CURRENT_MONTH:
                start = today.withDayOfMonth(1);
                end = today;
                break;
            case LAST_MONTH: {
                LocalDate firstOfThisMonth = today.withDayOfMonth(1);
                start = firstOfThisMonth.minusMonths(1);
                end = start.with(TemporalAdjusters.lastDayOfMonth());
                break;
            }
            case CURRENT_YEAR:
                start = today.withDayOfYear(1);
                end = today;
                break;
            case LAST_YEAR: {
                LocalDate firstOfThisYear = today.withDayOfYear(1);
                start = firstOfThisYear.minusYears(1);
                end = start.with(TemporalAdjusters.lastDayOfYear());
                break;
            }
            default:
                throw fail("不支持的日期快捷表达式: " + valueExp);
        }
        return new String[]{start.format(ISO_DATE), end.format(ISO_DATE)};
    }

    /**
     * 日历闭区间 → 半开绑定值 {@code [start 00:00:00, endInclusive+1 00:00:00)}。
     */
    public static String[] toHalfOpenDateTime(String startInclusive, String endInclusive) {
        LocalDate start = parseIsoDate(startInclusive, "start");
        LocalDate end = parseIsoDate(endInclusive, "end");
        if (end.isBefore(start)) {
            throw fail("日期区间结束不能早于开始");
        }
        return new String[]{
                start.atStartOfDay().format(DATE_TIME),
                end.plusDays(1).atStartOfDay().format(DATE_TIME)
        };
    }

    private static LocalDate parseIsoDate(String raw, String name) {
        if (StrUtil.isBlank(raw)) {
            throw fail("日期区间 " + name + " 不能为空");
        }
        try {
            return LocalDate.parse(raw.trim(), ISO_DATE);
        } catch (DateTimeParseException e) {
            throw fail("日期格式必须是 yyyy-MM-dd: " + raw);
        }
    }

    private static DateValueExpEnum parseExp(String valueExp) {
        DateValueExpEnum exp = DateValueExpEnum.of(valueExp);
        if (exp == null) {
            throw fail(StrUtil.isBlank(valueExp) ? "valueExp 不能为空" : "不支持的日期快捷表达式: " + valueExp);
        }
        return exp;
    }

    private static void validateValueCount(DateValueExpEnum exp, Object[] value) {
        int need = exp.getValueCount();
        if (need == 0) {
            return;
        }
        if (value == null || value.length < need) {
            throw fail(exp.getCode() + " 需要 " + need + " 个 value");
        }
    }

    private static int toInt(Object raw, String name) {
        if (raw == null) {
            throw fail(name + " 不能为空");
        }
        if (raw instanceof Number) {
            return ((Number) raw).intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(raw).trim());
        } catch (NumberFormatException e) {
            throw fail(name + " 必须是整数: " + raw);
        }
    }

    private static ResultException fail(String msg) {
        return new ResultException(ResultEnum.FAIL.getCode(), msg);
    }
}
