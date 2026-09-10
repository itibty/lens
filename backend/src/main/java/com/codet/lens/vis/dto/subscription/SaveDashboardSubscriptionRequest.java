package com.codet.lens.vis.dto.subscription;

import com.codet.lens.common.base.EnumValue;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Schema(description = "新建或编辑看板邮件订阅")
@Getter
@Setter
public class SaveDashboardSubscriptionRequest {
    @Schema(description = "订阅id。新增不传")
    private Long id;

    @NotNull(message = "看板不能为空")
    private Long dashboardId;

    @NotBlank(message = "订阅名称不能为空")
    @Size(max = 100, message = "订阅名称不能超过100个字符")
    private String subscriptionName;

    @NotBlank(message = "频率不能为空")
    @EnumValue(strValues = {"DAILY", "WEEKDAY", "WEEKLY", "MONTHLY"})
    private String scheduleType;

    @Valid
    @NotNull(message = "频率参数不能为空")
    private DashboardSubscriptionSchedule schedule;

    @NotBlank(message = "时区不能为空")
    @Size(max = 64, message = "时区不能超过64个字符")
    private String timezone = "Asia/Shanghai";
}
