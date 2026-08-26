package com.codet.lens.vis.controller;

import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.R;
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
import com.codet.lens.vis.service.VisCardService;
import com.codet.lens.vis.service.VisDashboardAccess;
import com.codet.lens.vis.service.VisDataService;
import com.codet.lens.vis.service.VisDateWindowService;
import com.codet.lens.vis.service.VisFilterOptionsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
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
@RequiredArgsConstructor
public class VisQueryController {

    private static final DateTimeFormatter EXPORT_TS = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final VisDateWindowService visDateWindowService;
    private final VisFilterOptionsService visFilterOptionsService;
    private final VisDataService visDataService;
    private final PivotDataService pivotDataService;
    private final VisCardService visCardService;
    private final VisDashboardAccess dashboardAccess;

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

    @Operation(operationId = "queryCardData", summary = "普通数据查询")
    @PostMapping("/dashboards/{dashboardId}/cards/{cardId}/data")
    public R<QueryDataResponse> queryCardData(
            @PathVariable Long dashboardId,
            @PathVariable Long cardId,
            @RequestBody QueryRequest request) {
        dashboardAccess.assertCanQueryCard(dashboardId);
        return R.success(visDataService.query(request));
    }

    @Operation(operationId = "queryCardPivot", summary = "透视表数据查询")
    @PostMapping("/dashboards/{dashboardId}/cards/{cardId}/pivot")
    public R<PivotQueryResponse> queryCardPivot(
            @PathVariable Long dashboardId,
            @PathVariable Long cardId,
            @RequestBody PivotQueryRequest request) {
        dashboardAccess.assertCanQueryCard(dashboardId);
        return R.success(pivotDataService.query(request));
    }

    @Operation(operationId = "queryCardDetail", summary = "卡片明细查询")
    @PostMapping("/dashboards/{dashboardId}/cards/{cardId}/detail")
    public R<QueryDataResponse> queryCardDetail(
            @PathVariable Long dashboardId,
            @PathVariable Long cardId,
            @RequestBody DetailQueryRequest request) {
        dashboardAccess.assertCanQueryCard(dashboardId);
        return R.success(visDataService.queryDetail(request));
    }

    @Tag(name = "EXPORT")
    @Operation(operationId = "exportCardData", summary = "卡片数据导出 Excel")
    @PostMapping("/dashboards/{dashboardId}/cards/{cardId}/export")
    public void exportCardData(
            @PathVariable Long dashboardId,
            @PathVariable Long cardId,
            @RequestBody QueryRequest request,
            HttpServletResponse response) throws IOException {
        String title = isAdhocExport(dashboardId, cardId) ? "数据" : resolveCardTitle(cardId);
        title = title.replaceAll("[\\\\/:*?\"<>|\\r\\n\\t]", "_").trim();
        String filename = title + "_" + LocalDateTime.now().format(EXPORT_TS) + ".xlsx";
        String encodedFilename = URLEncoder.encode(filename, "UTF-8").replace("+", "%20");

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-disposition", "attachment;filename*=utf-8''" + encodedFilename);

        dashboardAccess.assertCanQueryCard(dashboardId);
        visDataService.export(request, response.getOutputStream());
    }

    private static boolean isAdhocExport(Long dashboardId, Long cardId) {
        return Long.valueOf(0L).equals(dashboardId) && Long.valueOf(0L).equals(cardId);
    }

    private String resolveCardTitle(Long cardId) {
        String title = visCardService.detail(cardId).getCardName();
        return StrUtil.isBlank(title) ? "card_" + cardId : title;
    }
}
