package com.codet.lens.vis.enums;

import lombok.Getter;

/** 过滤操作符。协议用 code（eq/in/between…），SQL 用 value。 */
@Getter
public enum FilterOpEnum {

    EQ("eq", "等于", "="),
    NE("ne", "不等于", "!="),
    GT("gt", "大于", ">"),
    GTE("gte", "大于等于", ">="),
    LT("lt", "小于", "<"),
    LTE("lte", "小于等于", "<="),
    IN("in", "包含", "IN"),
    NOT_IN("not_in", "不包含", "NOT IN"),
    LIKE("like", "模糊匹配", "LIKE"),
    NOT_LIKE("not_like", "不匹配", "NOT LIKE"),
    BETWEEN("between", "介于", "BETWEEN"),
    IS_NULL("is_null", "为空", "IS NULL"),
    IS_NOT_NULL("is_not_null", "不为空", "IS NOT NULL");

    private final String code;
    private final String name;
    private final String value;

    FilterOpEnum(String code, String name, String value) {
        this.code = code;
        this.name = name;
        this.value = value;
    }

    public static FilterOpEnum of(String raw) {
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
