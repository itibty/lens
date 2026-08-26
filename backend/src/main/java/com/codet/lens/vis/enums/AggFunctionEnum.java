package com.codet.lens.vis.enums;

import lombok.Getter;

/** 聚合函数。COUNT_DISTINCT 的 SQL 为 COUNT(DISTINCT …)。 */
@Getter
public enum AggFunctionEnum {

    SUM("SUM", "求和", "SUM"),
    COUNT("COUNT", "计数", "COUNT"),
    AVG("AVG", "平均值", "AVG"),
    MIN("MIN", "最小值", "MIN"),
    MAX("MAX", "最大值", "MAX"),
    COUNT_DISTINCT("COUNT_DISTINCT", "去重计数", "COUNT");

    private final String code;
    private final String name;
    private final String value;

    AggFunctionEnum(String code, String name, String value) {
        this.code = code;
        this.name = name;
        this.value = value;
    }
}
