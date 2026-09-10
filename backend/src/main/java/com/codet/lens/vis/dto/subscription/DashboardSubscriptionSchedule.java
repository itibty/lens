package com.codet.lens.vis.dto.subscription;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "看板订阅频率参数")
@Getter
@Setter
public class DashboardSubscriptionSchedule {
    @NotBlank(message = "发送时间不能为空")
    @Pattern(regexp = "^(?:[01]\\d|2[0-3]):[0-5]\\d$", message = "发送时间格式应为HH:mm")
    @Schema(description = "订阅时区中的发送时间", example = "09:00")
    private String time;

    @Min(value = 1, message = "星期必须在1到7之间")
    @Max(value = 7, message = "星期必须在1到7之间")
    @Schema(description = "ISO星期：1为周一，7为周日")
    private Integer dayOfWeek;

    @Min(value = 1, message = "日期必须在1到28之间")
    @Max(value = 28, message = "日期必须在1到28之间")
    @Schema(description = "月中日期，首版限制1到28")
    private Integer dayOfMonth;
}
