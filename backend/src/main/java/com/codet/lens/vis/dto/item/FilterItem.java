package com.codet.lens.vis.dto.item;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "过滤条件")
@Getter
@Setter
public class FilterItem extends BaseField {

    @Schema(description = "操作符", allowableValues = {"eq", "ne", "gt", "gte", "lt", "lte", "in", "not_in", "like", "not_like", "between", "is_null", "is_not_null"})
    private String op;

    @Schema(description = "比较值")
    private Object[] value;

    @Schema(description = "日期快捷。current_week/current_month/current_year 为周期起始日～asOfDate", allowableValues = {
            "current_day", "last_day", "last_days", "last_xy_days",
            "current_week", "last_week", "current_month", "last_month",
            "current_year", "last_year"
    })
    private String valueExp;

    @Schema(description = "时间粒度。明细点击维带了粒度时，按同一表达式过滤", allowableValues = {"day", "week", "month", "year"})
    private String timeGrain;
}
