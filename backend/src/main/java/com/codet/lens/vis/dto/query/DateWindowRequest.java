package com.codet.lens.vis.dto.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotBlank;

@Schema(description = "日期快捷预览")
@Getter
@Setter
public class DateWindowRequest {

    @Schema(description = "日期快捷基准日")
    private String asOfDate;

    @Schema(description = "评估期快捷。current_week/current_month/current_year 为周期起始日～asOfDate", allowableValues = {
            "current_day", "last_day", "last_days", "last_xy_days",
            "current_week", "last_week", "current_month", "last_month",
            "current_year", "last_year"
    }, requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "valueExp不能为空")
    private String valueExp;

    @Schema(description = "快捷参数")
    private Object[] value;

    @Schema(description = "对比期平移", allowableValues = {
            "shift_day", "shift_week", "shift_month", "shift_year", "shift_period"
    })
    private String calcMethod;
}
