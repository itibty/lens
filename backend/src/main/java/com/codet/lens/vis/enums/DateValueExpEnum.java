package com.codet.lens.vis.enums;

import lombok.Getter;

/**
 * 日期快捷表达式。展开为日历闭区间 {@code [start, end]}，日期格式 yyyy-MM-dd。
 * SQL 绑定为半开区间 {@code [start 00:00:00, end+1 00:00:00)}。
 * <p>
 * 周按 ISO（周一起始）。{@code current_week}/{@code current_month}/{@code current_year} 为周期起始日～asOfDate（含当天）；
 * {@code last_week}/{@code last_month}/{@code last_year} 为完整自然周期。
 * {@code last_days} 含今天；{@code last_xy_days} 为距今 X 天前到 Y 天前（含两端，X &gt; Y）。
 */
@Getter
public enum DateValueExpEnum {

    CURRENT_DAY("current_day", "今天", 0),
    LAST_DAY("last_day", "昨天", 0),
    LAST_DAYS("last_days", "最近N天", 1),
    LAST_XY_DAYS("last_xy_days", "最近X-Y天", 2),
    CURRENT_WEEK("current_week", "本周", 0),
    LAST_WEEK("last_week", "上周", 0),
    CURRENT_MONTH("current_month", "本月", 0),
    LAST_MONTH("last_month", "上月", 0),
    CURRENT_YEAR("current_year", "今年", 0),
    LAST_YEAR("last_year", "去年", 0);

    private final String code;
    private final String name;
    /** 需要从 {@code value} 读取的参数个数；0 表示不需要 value */
    private final int valueCount;

    DateValueExpEnum(String code, String name, int valueCount) {
        this.code = code;
        this.name = name;
        this.valueCount = valueCount;
    }

    public static DateValueExpEnum of(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        try {
            return valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
