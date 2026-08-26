package com.codet.lens.vis.controller;

import com.codet.lens.common.R;
import com.codet.lens.vis.dto.card.VisCardInfo;
import com.codet.lens.vis.dto.dash.VisDashboardInfo;
import com.codet.lens.vis.dto.dataset.VisFilterOptionsRequest;
import com.codet.lens.vis.dto.dataset.VisFilterOptionsResponse;
import com.codet.lens.vis.dto.pivot.PivotQueryRequest;
import com.codet.lens.vis.dto.pivot.PivotQueryResponse;
import com.codet.lens.vis.dto.query.DateWindowRequest;
import com.codet.lens.vis.dto.query.DateWindowResponse;
import com.codet.lens.vis.dto.query.DetailQueryRequest;
import com.codet.lens.vis.dto.query.QueryDataResponse;
import com.codet.lens.vis.dto.query.QueryRequest;
import com.codet.lens.vis.service.PivotDataService;
import com.codet.lens.vis.service.VisBoundQueryService;
import com.codet.lens.vis.service.VisCardService;
import com.codet.lens.vis.service.VisDashboardAccess;
import com.codet.lens.vis.service.VisDashboardService;
import com.codet.lens.vis.service.VisDataService;
import com.codet.lens.vis.service.VisDateWindowService;
import com.codet.lens.vis.service.VisFilterOptionsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URLEncoder;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Tag(name = "QUERY")
@RestController
@Validated
@RequiredArgsConstructor
public class VisQueryController {

    private static final DateTimeFormatter EXPORT_TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final VisDateWindowService visDateWindowService;
    private final VisFilterOptionsService visFilterOptionsService;
    private final VisDataService visDataService;
    private final PivotDataService pivotDataService;
    private final VisBoundQueryService boundQuery;
    private final VisDashboardAccess dashboardAccess;
    private final VisDashboardService visDashboardService;
    private final VisCardService visCardService;

    @Operation(operationId = "getDashboardDetail", summary = "看板查询结构")
    @GetMapping("/vis/dashboards/{dashboardId}")
    public R<VisDashboardInfo> getDashboardDetail(
            @PathVariable @NotNull(message = "dashboardId不能为空") Long dashboardId) {
        return R.success(visDashboardService.detail(dashboardId));
    }

    @Operation(operationId = "getCardDetail", summary = "卡片查询结构")
    @GetMapping("/vis/cards/{cardId}")
    public R<VisCardInfo> getCardDetail(
            @PathVariable @NotNull(message = "cardId不能为空") Long cardId) {
        return R.success(visCardService.detail(cardId));
    }

    @Operation(operationId = "previewDateWindow", summary = "日期快捷预览")
    @PostMapping("/vis/date-window")
    public R<DateWindowResponse> previewDateWindow(@Validated @RequestBody DateWindowRequest request) {
        dashboardAccess.assertCanUseVisQuery();
        return R.success(visDateWindowService.preview(request));
    }

    @Operation(operationId = "listFilterOptions", summary = "筛选枚举")
    @PostMapping("/vis/filter-options")
    public R<VisFilterOptionsResponse> listFilterOptions(
            @Validated @RequestBody VisFilterOptionsRequest request) {
        dashboardAccess.assertCanUseVisQuery();
        return R.success(visFilterOptionsService.list(request));
    }

    /**
     * 普通查数。0/0 信 body（设计器预览）；有看板+卡片 id 用库里的 query_json，只收全局筛选。
     */
    @Operation(operationId = "queryCardData", summary = "普通数据查询")
    @PostMapping("/dashboards/{dashboardId}/cards/{cardId}/data")
    public R<QueryDataResponse> queryCardData(
            @PathVariable Long dashboardId,
            @PathVariable Long cardId,
            @RequestBody QueryRequest request) {
        return R.success(visDataService.query(boundQuery.bindData(dashboardId, cardId, request)));
    }

    @Operation(operationId = "queryCardPivot", summary = "透视表数据查询")
    @PostMapping("/dashboards/{dashboardId}/cards/{cardId}/pivot")
    public R<PivotQueryResponse> queryCardPivot(
            @PathVariable Long dashboardId,
            @PathVariable Long cardId,
            @RequestBody PivotQueryRequest request) {
        return R.success(pivotDataService.query(boundQuery.bindPivot(dashboardId, cardId, request)));
    }

    @Operation(operationId = "queryCardDetail", summary = "卡片明细查询")
    @PostMapping("/dashboards/{dashboardId}/cards/{cardId}/detail")
    public R<QueryDataResponse> queryCardDetail(
            @PathVariable Long dashboardId,
            @PathVariable Long cardId,
            @RequestBody DetailQueryRequest request) {
        return R.success(visDataService.queryDetail(boundQuery.bindDetail(dashboardId, cardId, request)));
    }

    @Tag(name = "EXPORT")
    @Operation(operationId = "exportCardData", summary = "卡片数据导出 Excel")
    @PostMapping("/dashboards/{dashboardId}/cards/{cardId}/export")
    public void exportCardData(
            @PathVariable Long dashboardId,
            @PathVariable Long cardId,
            @RequestBody QueryRequest request,
            HttpServletResponse response) throws IOException {
        QueryRequest bound = boundQuery.bindData(dashboardId, cardId, request);
        String title = isAdhocExport(dashboardId, cardId) ? "数据" : boundQuery.cardTitle(cardId);
        title = title.replaceAll("[\\\\/:*?\"<>|\\r\\n\\t]", "_").trim();
        String filename = title + "_" + LocalDateTime.now().format(EXPORT_TS) + ".xlsx";
        String encodedFilename = URLEncoder.encode(filename, "UTF-8").replace("+", "%20");

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-disposition", "attachment;filename*=utf-8''" + encodedFilename);

        visDataService.export(bound, response.getOutputStream());
    }

    private static boolean isAdhocExport(Long dashboardId, Long cardId) {
        return Long.valueOf(0L).equals(dashboardId) && Long.valueOf(0L).equals(cardId);
    }
}
