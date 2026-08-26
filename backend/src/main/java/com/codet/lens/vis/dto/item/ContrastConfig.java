package com.codet.lens.vis.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "指标对比")
@Getter
@Setter
public class ContrastConfig {

    @Schema(description = "对比用的日期字段", requiredMode = Schema.RequiredMode.REQUIRED)
    private String timeField;

    @Schema(description = "对比期平移", allowableValues = {
            "shift_day", "shift_week", "shift_month", "shift_year", "shift_period"
    }, requiredMode = Schema.RequiredMode.REQUIRED)
    private String calcMethod;

    @Schema(description = "结果列", allowableValues = {"diff", "diffRate"}, requiredMode = Schema.RequiredMode.REQUIRED)
    private String calcType;

    @Schema(description = "评估期快捷。current_week/current_month/current_year 为周期起始日～asOfDate", allowableValues = {
            "current_day", "last_day", "last_days", "last_xy_days",
            "current_week", "last_week", "current_month", "last_month",
            "current_year", "last_year"
    }, requiredMode = Schema.RequiredMode.REQUIRED)
    private String valueExp;

    @Schema(description = "快捷参数")
    private Object[] value;
}
