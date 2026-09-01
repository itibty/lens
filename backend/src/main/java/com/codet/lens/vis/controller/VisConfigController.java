package com.codet.lens.vis.controller;

import com.codet.lens.common.auth.Permission;
import com.codet.lens.common.base.IdsRequest;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.PageResponse;
import com.codet.lens.common.base.R;
import com.codet.lens.sys.SysPerms;
import com.codet.lens.vis.dto.card.QueryVisCardRequest;
import com.codet.lens.vis.dto.card.VisCardInfo;
import com.codet.lens.vis.dto.card.VisCardSaveRequest;
import com.codet.lens.vis.dto.dash.MoveDashboardsGroupRequest;
import com.codet.lens.vis.dto.dash.QueryVisDashboardRequest;
import com.codet.lens.vis.dto.dash.VisDashboardInfo;
import com.codet.lens.vis.dto.dash.VisDashboardMetadataUpdateRequest;
import com.codet.lens.vis.dto.dash.VisDashboardRefInfo;
import com.codet.lens.vis.dto.dash.VisDashboardSaveRequest;
import com.codet.lens.vis.dto.group.VisGroupDtos.AssignNode;
import com.codet.lens.vis.dto.group.VisGroupDtos.DashGroupInfo;
import com.codet.lens.vis.dto.group.VisGroupDtos.ManageNode;
import com.codet.lens.vis.dto.group.VisGroupDtos.ReportNode;
import com.codet.lens.vis.dto.group.VisGroupDtos.SaveDashGroupRequest;
import com.codet.lens.vis.service.VisCardService;
import com.codet.lens.vis.service.VisDashboardService;
import com.codet.lens.vis.service.VisDashGroupService;
import com.codet.lens.vis.VisPerms;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
public class VisConfigController {

    private final VisCardService visCardService;
    private final VisDashboardService visDashboardService;
    private final VisDashGroupService visDashGroupService;

    @Tag(name = "CARD")
    @Operation(operationId = "queryCards", summary = "分页查询卡片")
    @Permission(VisPerms.VIS_CARD_CONF)
    @PostMapping("/cards/query")
    public R<PageResponse<VisCardInfo>> queryCards(@Validated @RequestBody QueryVisCardRequest request) {
        return R.success(visCardService.query(request));
    }

    @Tag(name = "CARD")
    @Operation(operationId = "listCardDashboards", summary = "卡片引用的看板")
    @Permission({VisPerms.VIS_CARD_CONF, VisPerms.VIS_DASHBOARD_CONF})
    @GetMapping("/cards/dashboards")
    public R<ListResponse<VisDashboardRefInfo>> listCardDashboards(
            @NotNull(message = "cardId不能为空") Long cardId) {
        return R.success(visCardService.listRefDashboards(cardId));
    }

    @Tag(name = "CARD")
    @Operation(operationId = "editCard", summary = "新建或编辑卡片")
    @Permission(VisPerms.VIS_CARD_CONF)
    @PostMapping("/cards/edit")
    public R<Long> editCard(@Validated @RequestBody VisCardSaveRequest request) {
        return R.success(visCardService.save(request));
    }

    @Tag(name = "CARD")
    @Operation(operationId = "toggleCardStatus", summary = "卡片启用/禁用")
    @Permission(VisPerms.VIS_CARD_CONF)
    @PostMapping("/cards/toggle-status")
    public R<String> toggleCardStatus(@NotNull(message = "cardId不能为空") Long cardId) {
        visCardService.toggleStatus(cardId);
        return R.success();
    }

    @Tag(name = "CARD")
    @Operation(operationId = "delCard", summary = "删除卡片")
    @Permission(VisPerms.VIS_CARD_CONF)
    @PostMapping("/cards/del")
    public R<Void> delCard(@Validated @RequestBody IdsRequest request) {
        visCardService.delete(request.getIds());
        return R.success();
    }

    @Tag(name = "DASHBOARD")
    @Operation(operationId = "queryDashboards", summary = "分页查询看板")
    @Permission(VisPerms.VIS_DASHBOARD_CONF)
    @PostMapping("/dashboards/query")
    public R<PageResponse<VisDashboardInfo>> queryDashboards(
            @Validated @RequestBody QueryVisDashboardRequest request) {
        return R.success(visDashboardService.query(request));
    }

    @Tag(name = "DASHBOARD")
    @Operation(operationId = "listDashboardAssignTree", summary = "角色分配看板树")
    @Permission({VisPerms.VIS_DASHBOARD_CONF, SysPerms.SYS_ROLE_WRITE})
    @GetMapping("/dashboards/assign-tree")
    public R<ListResponse<AssignNode>> listDashboardAssignTree() {
        return R.success(visDashGroupService.assignTree());
    }

    @Tag(name = "DASHBOARD")
    @Operation(operationId = "listDashboardReportTree", summary = "报表中心看板树")
    @GetMapping("/dashboards/report-tree")
    public R<ListResponse<ReportNode>> listDashboardReportTree() {
        return R.success(visDashGroupService.reportTree());
    }

    @Tag(name = "DASHBOARD")
    @Operation(operationId = "listDashboardManageTree", summary = "看板管理混合树")
    @Permission(VisPerms.VIS_DASHBOARD_CONF)
    @GetMapping("/dashboards/manage-tree")
    public R<ListResponse<ManageNode>> listDashboardManageTree() {
        return R.success(visDashGroupService.manageTree());
    }

    @Tag(name = "DASH_GROUP")
    @Operation(operationId = "listDashGroupTree", summary = "看板分组树")
    @Permission({VisPerms.VIS_DASHBOARD_CONF, SysPerms.SYS_ROLE_WRITE})
    @GetMapping("/dash-groups/tree")
    public R<ListResponse<DashGroupInfo>> listDashGroupTree() {
        return R.success(visDashGroupService.tree());
    }

    @Tag(name = "DASH_GROUP")
    @Operation(operationId = "editDashGroup", summary = "新建或编辑看板分组")
    @Permission(VisPerms.VIS_DASHBOARD_CONF)
    @PostMapping("/dash-groups/edit")
    public R<Long> editDashGroup(@Validated @RequestBody SaveDashGroupRequest request) {
        return R.success(visDashGroupService.save(request));
    }

    @Tag(name = "DASH_GROUP")
    @Operation(operationId = "delDashGroup", summary = "删除看板分组")
    @Permission(VisPerms.VIS_DASHBOARD_CONF)
    @PostMapping("/dash-groups/del")
    public R<String> delDashGroup(@NotNull(message = "groupId不能为空") Long groupId) {
        visDashGroupService.delete(groupId);
        return R.success();
    }

    @Tag(name = "DASH_GROUP")
    @Operation(operationId = "toggleDashGroupStatus", summary = "看板分组启用/禁用")
    @Permission(VisPerms.VIS_DASHBOARD_CONF)
    @PostMapping("/dash-groups/toggle-status")
    public R<String> toggleDashGroupStatus(@NotNull(message = "groupId不能为空") Long groupId) {
        visDashGroupService.toggle(groupId);
        return R.success();
    }

    @Tag(name = "DASHBOARD")
    @Operation(operationId = "moveDashboardsGroup", summary = "看板移入分组")
    @Permission(VisPerms.VIS_DASHBOARD_CONF)
    @PostMapping("/dashboards/move-group")
    public R<Void> moveDashboardsGroup(@Validated @RequestBody MoveDashboardsGroupRequest request) {
        visDashboardService.moveGroup(request.getDashboardIds(), request.getGroupId());
        return R.success();
    }

    @Tag(name = "DASHBOARD")
    @Operation(operationId = "editDashboard", summary = "新建或编辑看板")
    @Permission(VisPerms.VIS_DASHBOARD_CONF)
    @PostMapping("/dashboards/edit")
    public R<Long> editDashboard(@Validated @RequestBody VisDashboardSaveRequest request) {
        return R.success(visDashboardService.save(request));
    }

    @Tag(name = "DASHBOARD")
    @Operation(operationId = "editDashboardMeta", summary = "编辑看板元数据")
    @Permission(VisPerms.VIS_DASHBOARD_CONF)
    @PostMapping("/dashboards/edit-meta")
    public R<Void> editDashboardMeta(
            @Validated @RequestBody VisDashboardMetadataUpdateRequest request) {
        visDashboardService.updateMetadata(request);
        return R.success();
    }

    @Tag(name = "DASHBOARD")
    @Operation(operationId = "toggleDashboardStatus", summary = "看板启用/禁用")
    @Permission(VisPerms.VIS_DASHBOARD_CONF)
    @PostMapping("/dashboards/toggle-status")
    public R<String> toggleDashboardStatus(@NotNull(message = "dashboardId不能为空") Long dashboardId) {
        visDashboardService.toggleStatus(dashboardId);
        return R.success();
    }

    @Tag(name = "DASHBOARD")
    @Operation(operationId = "delDashboard", summary = "删除看板")
    @Permission(VisPerms.VIS_DASHBOARD_CONF)
    @PostMapping("/dashboards/del")
    public R<Void> delDashboard(@Validated @RequestBody IdsRequest request) {
        visDashboardService.delete(request.getIds());
        return R.success();
    }
}
