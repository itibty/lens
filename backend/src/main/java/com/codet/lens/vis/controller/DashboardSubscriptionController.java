package com.codet.lens.vis.controller;

import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.R;
import com.codet.lens.vis.dto.subscription.DashboardSubscriptionInfo;
import com.codet.lens.vis.dto.subscription.DashboardSubscriptionRunInfo;
import com.codet.lens.vis.dto.subscription.SaveDashboardSubscriptionRequest;
import com.codet.lens.vis.entity.VisDashboardSubscription;
import com.codet.lens.vis.subscription.DashboardSubscriptionJobService;
import com.codet.lens.vis.subscription.DashboardSubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "DASHBOARD_SUBSCRIPTION")
@RestController
@Validated
@RequiredArgsConstructor
public class DashboardSubscriptionController {
    private final DashboardSubscriptionService subscriptionService;
    private final DashboardSubscriptionJobService jobService;

    @Operation(operationId = "listDashboardSubscriptions", summary = "当前用户的看板订阅")
    @GetMapping("/dashboards/{dashboardId}/subscriptions")
    public R<ListResponse<DashboardSubscriptionInfo>> list(@PathVariable Long dashboardId) {
        return R.success(subscriptionService.list(dashboardId));
    }

    @Operation(operationId = "listDashboardSubscriptionRuns", summary = "看板订阅执行记录")
    @GetMapping("/dashboards/subscriptions/{subscriptionId}/runs")
    public R<ListResponse<DashboardSubscriptionRunInfo>> runs(@PathVariable Long subscriptionId) {
        return R.success(subscriptionService.runs(subscriptionId));
    }

    @Operation(operationId = "editDashboardSubscription", summary = "新建或编辑看板订阅")
    @PostMapping("/dashboards/subscriptions/edit")
    public R<Long> edit(@Valid @RequestBody SaveDashboardSubscriptionRequest request) {
        return R.success(subscriptionService.save(request));
    }

    @Operation(operationId = "toggleDashboardSubscription", summary = "启用或停用看板订阅")
    @PostMapping("/dashboards/subscriptions/{subscriptionId}/toggle")
    public R<Void> toggle(@PathVariable @NotNull Long subscriptionId) {
        subscriptionService.toggle(subscriptionId);
        return R.success();
    }

    @Operation(operationId = "deleteDashboardSubscription", summary = "删除看板订阅")
    @PostMapping("/dashboards/subscriptions/{subscriptionId}/delete")
    public R<Void> delete(@PathVariable @NotNull Long subscriptionId) {
        subscriptionService.delete(subscriptionId);
        return R.success();
    }

    @Operation(operationId = "testDashboardSubscription", summary = "立即测试看板订阅")
    @PostMapping("/dashboards/subscriptions/{subscriptionId}/test")
    public R<Long> test(@PathVariable @NotNull Long subscriptionId) {
        VisDashboardSubscription subscription = subscriptionService.requireOwned(subscriptionId);
        return R.success(jobService.queueManual(subscription));
    }
}
