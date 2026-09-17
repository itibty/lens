package com.codet.lens.vis.controller;

import com.codet.lens.common.auth.Permission;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.PageResponse;
import com.codet.lens.common.base.R;
import com.codet.lens.vis.VisPerms;
import com.codet.lens.vis.dto.datasource.DatasourceConnectionRequest;
import com.codet.lens.vis.dto.datasource.DatasourceDatasetInfo;
import com.codet.lens.vis.dto.datasource.DatasourceInfo;
import com.codet.lens.vis.dto.datasource.DatasourceStatusRequest;
import com.codet.lens.vis.dto.datasource.DatasourceTestResult;
import com.codet.lens.vis.dto.datasource.QueryDatasourceRequest;
import com.codet.lens.vis.dto.datasource.SaveDatasourceRequest;
import com.codet.lens.vis.service.DatasourceAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "DATASOURCE")
@RestController
@Validated
@RequiredArgsConstructor
@Permission(VisPerms.VIS_DATASOURCE_CONF)
public class DatasourceController {
    private final DatasourceAdminService service;

    @PostMapping("/datasources/query")
    @Operation(operationId = "queryDatasources", summary = "数据源列表")
    public R<PageResponse<DatasourceInfo>> query(@Valid @RequestBody QueryDatasourceRequest request) {
        return R.success(service.query(request));
    }

    @GetMapping("/datasources/detail")
    @Operation(operationId = "getDatasourceDetail", summary = "数据源详情")
    public R<DatasourceInfo> detail(@RequestParam @NotNull Long datasourceId) {
        return R.success(service.detail(datasourceId));
    }

    @PostMapping("/datasources/edit")
    @Operation(operationId = "editDatasource", summary = "保存数据源")
    public R<Long> save(@Valid @RequestBody SaveDatasourceRequest request) {
        return R.success(service.save(request));
    }

    @PostMapping("/datasources/test")
    @Operation(operationId = "testDatasource", summary = "测试连接")
    public R<DatasourceTestResult> test(@Valid @RequestBody DatasourceConnectionRequest request) {
        return R.success(service.test(request));
    }

    @GetMapping("/datasources/datasets")
    @Operation(operationId = "listDatasourceDatasets", summary = "引用数据集")
    public R<ListResponse<DatasourceDatasetInfo>> references(@RequestParam @NotNull Long datasourceId) {
        return R.success(new ListResponse<>(service.references(datasourceId)));
    }

    @PostMapping("/datasources/status")
    @Operation(operationId = "setDatasourceStatus", summary = "启停数据源")
    public R<Void> status(@Valid @RequestBody DatasourceStatusRequest request) {
        service.status(request);
        return R.success();
    }

    @PostMapping("/datasources/del")
    @Operation(operationId = "delDatasource", summary = "删除数据源")
    public R<Void> delete(@RequestParam @NotNull Long datasourceId) {
        service.delete(datasourceId);
        return R.success();
    }
}
