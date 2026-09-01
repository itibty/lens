package com.codet.lens.vis.core.query;

import com.codet.lens.common.base.ResultEnum;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.item.ContrastConfig;
import com.codet.lens.vis.dto.item.MetricItem;
import com.codet.lens.vis.dto.query.ContrastInfo;
import com.codet.lens.vis.dto.query.ContrastRange;
import com.codet.lens.vis.enums.ContrastCalcTypeEnum;
import com.codet.lens.vis.enums.ContrastMethodEnum;
import com.codet.lens.vis.enums.DateValueExpEnum;
import java.time.format.DateTimeFormatter;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 评估期 {@code valueExp} → 日历闭区间，再按 {@code calcMethod} 平移出对比期。
 * {@code current_month}+{@code shift_month} 按日对齐（3/31→2/28）；{@code last_month} 仍平移到上一完整自然月。
 * {@code current_week}/{@code last_week}+{@code shift_year} 减 52 周（对齐星期几）；
 * {@code current_year}+{@code shift_year} 为今年至今对去年同期；其余 {@code shift_year} 仍日历减年。
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class ContrastWindowResolver {

    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    @Getter
    public static final class Window {
        private final LocalDate asOfDate;
        private final String[] current;
        private final String[] compare;

        private Window(LocalDate asOfDate, String[] current, String[] compare) {
            this.asOfDate = asOfDate;
            this.current = current;
            this.compare = compare;
        }
    }

    public static Window resolve(ContrastConfig contrast) {
        return resolve(contrast, LocalDate.now());
    }

    public static Window resolve(ContrastConfig contrast, LocalDate today) {
        if (contrast == null) {
            throw fail("contrast 不能为空");
        }
        return preview(contrast.getValueExp(), contrast.getValue(), contrast.getCalcMethod(), today, true);
    }

    /** 配置预览：{@code calcMethod} 可空，只算评估期。{@code today} 空则用当天。 */
    public static Window preview(String valueExp, Object[] value, String calcMethod, LocalDate today) {
        return preview(valueExp, value, calcMethod, today, false);
    }

    private static Window preview(String valueExp, Object[] value, String calcMethod, LocalDate today,
                                  boolean requireMethod) {
        LocalDate asOfDate = today != null ? today : LocalDate.now();
        DateValueExpEnum exp = DateValueExpEnum.of(valueExp);
        if (exp == null) {
            throw fail(valueExp == null || valueExp.trim().isEmpty()
                    ? "valueExp 不能为空" : "不支持的日期快捷表达式: " + valueExp);
        }
        String[] current = DateValueExpResolver.resolve(valueExp, value, asOfDate);
        if (calcMethod == null || calcMethod.trim().isEmpty()) {
            if (requireMethod) {
                throw fail("不支持的对比算法: " + calcMethod);
            }
            return new Window(asOfDate, current, null);
        }
        ContrastMethodEnum method = ContrastMethodEnum.of(calcMethod);
        if (method == null) {
            throw fail("不支持的对比算法: " + calcMethod);
        }
        if (!allowed(exp, method)) {
            throw fail("评估期 " + exp.getCode() + " 不支持 " + method.getCode());
        }
        return new Window(asOfDate, current, shift(current, method, exp));
    }

    public static ContrastInfo toInfo(MetricItem metric, Window window) {
        ContrastConfig contrast = metric.getContrast();
        ContrastInfo info = new ContrastInfo();
        info.setLabel(metric.getLabel());
        info.setTimeField(contrast.getTimeField());
        info.setCalcMethod(ContrastMethodEnum.of(contrast.getCalcMethod()).getCode());
        info.setCalcType(ContrastCalcTypeEnum.of(contrast.getCalcType()).getCode());
        ContrastRange current = new ContrastRange();
        current.setValueExp(contrast.getValueExp());
        current.setStart(window.getCurrent()[0]);
        current.setEnd(window.getCurrent()[1]);
        ContrastRange compare = new ContrastRange();
        compare.setStart(window.getCompare()[0]);
        compare.setEnd(window.getCompare()[1]);
        info.setCurrent(current);
        info.setCompare(compare);
        return info;
    }

    static boolean allowed(DateValueExpEnum exp, ContrastMethodEnum method) {
        switch (exp) {
            case CURRENT_DAY:
            case LAST_DAY:
                return method == ContrastMethodEnum.SHIFT_DAY
                        || method == ContrastMethodEnum.SHIFT_WEEK
                        || method == ContrastMethodEnum.SHIFT_YEAR;
            case CURRENT_WEEK:
            case LAST_WEEK:
                return method == ContrastMethodEnum.SHIFT_WEEK
                        || method == ContrastMethodEnum.SHIFT_YEAR;
            case CURRENT_MONTH:
            case LAST_MONTH:
                return method == ContrastMethodEnum.SHIFT_MONTH
                        || method == ContrastMethodEnum.SHIFT_YEAR;
            case CURRENT_YEAR:
            case LAST_YEAR:
                return method == ContrastMethodEnum.SHIFT_YEAR;
            case LAST_DAYS:
            case LAST_XY_DAYS:
                return method == ContrastMethodEnum.SHIFT_PERIOD
                        || method == ContrastMethodEnum.SHIFT_YEAR;
            default:
                return false;
        }
    }

    private static String[] shift(String[] current, ContrastMethodEnum method, DateValueExpEnum exp) {
        LocalDate start = LocalDate.parse(current[0], ISO_DATE);
        LocalDate end = LocalDate.parse(current[1], ISO_DATE);
        LocalDate compareStart;
        LocalDate compareEnd;
        switch (method) {
            case SHIFT_DAY:
                compareStart = start.minusDays(1);
                compareEnd = end.minusDays(1);
                break;
            case SHIFT_WEEK:
                compareStart = start.minusWeeks(1);
                compareEnd = end.minusWeeks(1);
                break;
            case SHIFT_MONTH:
                if (exp == DateValueExpEnum.CURRENT_MONTH) {
                    // 本月至今：对齐到日；月末由 minusMonths 钳位（3/31→2/28，4/30→3/30）
                    compareStart = start.minusMonths(1);
                    compareEnd = end.minusMonths(1);
                } else {
                    // last_month 等完整月：上一完整自然月
                    compareStart = start.minusMonths(1).withDayOfMonth(1);
                    compareEnd = compareStart.with(TemporalAdjusters.lastDayOfMonth());
                }
                break;
            case SHIFT_YEAR:
                if (exp == DateValueExpEnum.CURRENT_WEEK || exp == DateValueExpEnum.LAST_WEEK) {
                    compareStart = start.minusWeeks(52);
                    compareEnd = end.minusWeeks(52);
                } else {
                    compareStart = start.minusYears(1);
                    compareEnd = end.minusYears(1);
                }
                break;
            case SHIFT_PERIOD:
                long days = ChronoUnit.DAYS.between(start, end) + 1;
                compareStart = start.minusDays(days);
                compareEnd = end.minusDays(days);
                break;
            default:
                throw fail("不支持的对比算法: " + method);
        }
        return new String[]{compareStart.format(ISO_DATE), compareEnd.format(ISO_DATE)};
    }

    private static ResultException fail(String msg) {
        return new ResultException(ResultEnum.FAIL.getCode(), msg);
    }
}
