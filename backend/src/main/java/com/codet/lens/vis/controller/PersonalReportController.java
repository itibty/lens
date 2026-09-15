package com.codet.lens.vis.controller;

import com.codet.lens.common.base.R;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.vis.dto.dash.PersonalReportDtos.*;
import com.codet.lens.vis.service.PersonalReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "PERSONAL_REPORT")
public class PersonalReportController {
    private final PersonalReportService service;

    @GetMapping("/dashboards/personal/reports")
    @Operation(operationId = "listPersonalReports", summary = "我的报表")
    public R<ListResponse<PersonalReportInfo>> reports() { return R.success(new ListResponse<>(service.reports())); }

    @GetMapping("/dashboards/{dashboardId}/personal")
    @Operation(operationId = "getReportPreference", summary = "个人报表偏好")
    public R<PersonalReportInfo> preference(@PathVariable Long dashboardId) { return R.success(service.preference(dashboardId)); }

    @PostMapping("/dashboards/personal/favorite")
    @Operation(operationId = "setReportFavorite", summary = "收藏或取消收藏")
    public R<Void> favorite(@Valid @RequestBody ReportPreferenceRequest request) { service.favorite(request); return R.success(); }

    @PostMapping("/dashboards/{dashboardId}/personal/visit")
    @Operation(operationId = "recordReportVisit", summary = "记录报表访问")
    public R<Void> visit(@PathVariable Long dashboardId) { service.visit(dashboardId); return R.success(); }

    @GetMapping("/dashboards/{dashboardId}/personal/views")
    @Operation(operationId = "listPersonalViews", summary = "个人视图列表")
    public R<ListResponse<PersonalViewInfo>> views(@PathVariable Long dashboardId) { return R.success(new ListResponse<>(service.listViews(dashboardId))); }

    @PostMapping("/dashboards/personal/views/save")
    @Operation(operationId = "savePersonalView", summary = "保存个人视图")
    public R<Long> save(@Valid @RequestBody SavePersonalViewRequest request) { return R.success(service.saveView(request)); }

    @PostMapping("/dashboards/personal/views/{viewId}/delete")
    @Operation(operationId = "deletePersonalView", summary = "删除个人视图")
    public R<Void> delete(@PathVariable Long viewId) { service.deleteView(viewId); return R.success(); }

    @PostMapping("/dashboards/personal/views/default")
    @Operation(operationId = "setDefaultPersonalView", summary = "设置或清除个人默认视图")
    public R<Void> defaultView(@Valid @RequestBody ReportPreferenceRequest request) { service.defaultView(request); return R.success(); }

    @PostMapping("/dashboards/personal/views/resolve")
    @Operation(operationId = "resolvePersonalView", summary = "校验并恢复个人查看状态")
    public R<ResolvedView> resolve(@Valid @RequestBody ResolveViewRequest request) { return R.success(service.resolve(request)); }
}
