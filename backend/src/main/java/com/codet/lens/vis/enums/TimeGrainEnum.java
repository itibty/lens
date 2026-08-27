package com.codet.lens.vis.enums;

import lombok.Getter;

/**
 * 维度时间粒度。SELECT / GROUP BY 共用同一表达式（按粒度格式化后的周期）。
 * 周按 ISO（周一起始），与日期快捷一致。
 */
@Getter
public enum TimeGrainEnum {

    DAY("day", "日"),
    WEEK("week", "周"),
    MONTH("month", "月"),
    YEAR("year", "年");

    private final String code;
    private final String name;

    TimeGrainEnum(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public static TimeGrainEnum of(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String key = raw.trim();
        for (TimeGrainEnum item : values()) {
            if (item.code.equalsIgnoreCase(key) || item.name().equalsIgnoreCase(key)) {
                return item;
            }
        }
        return null;
    }
}
