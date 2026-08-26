package com.codet.lens.vis.enums;

import lombok.Getter;

/**
 * 对比期平移算法。环比/同比只是文案，不进协议。
 */
@Getter
public enum ContrastMethodEnum {

    SHIFT_DAY("shift_day", "按天平移"),
    SHIFT_WEEK("shift_week", "按周平移"),
    SHIFT_MONTH("shift_month", "按月平移"),
    SHIFT_YEAR("shift_year", "按年平移"),
    SHIFT_PERIOD("shift_period", "按当前窗长平移");

    private final String code;
    private final String name;

    ContrastMethodEnum(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public static ContrastMethodEnum of(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String key = raw.trim();
        for (ContrastMethodEnum item : values()) {
            if (item.code.equalsIgnoreCase(key) || item.name().equalsIgnoreCase(key)) {
                return item;
            }
        }
        return null;
    }
}
