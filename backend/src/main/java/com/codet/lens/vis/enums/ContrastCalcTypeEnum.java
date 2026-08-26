package com.codet.lens.vis.enums;

import lombok.Getter;

/** 对比结果列：差额或差异率。 */
@Getter
public enum ContrastCalcTypeEnum {

    DIFF("diff", "差额"),
    DIFF_RATE("diffRate", "差异率");

    private final String code;
    private final String name;

    ContrastCalcTypeEnum(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public static ContrastCalcTypeEnum of(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        String key = raw.trim();
        for (ContrastCalcTypeEnum item : values()) {
            if (item.code.equalsIgnoreCase(key) || item.name().equalsIgnoreCase(key)) {
                return item;
            }
        }
        return null;
    }
}
