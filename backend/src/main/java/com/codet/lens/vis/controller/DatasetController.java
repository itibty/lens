package com.codet.lens.vis.controller;

import com.codet.lens.common.auth.Permission;
import com.codet.lens.common.base.IdsRequest;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.PageResponse;
import com.codet.lens.common.base.R;
import com.codet.lens.common.base.ResultEnum;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.core.query.SqlDialect;
import com.codet.lens.vis.dto.dataset.ConfSqlContentRequest;
import com.codet.lens.vis.dto.dataset.ConfSqlFieldInfo;
import com.codet.lens.vis.dto.dataset.ConfSqlInfo;
import com.codet.lens.vis.dto.dataset.ConfSqlInfoRequest;
import com.codet.lens.vis.dto.dataset.DatasetSourceChangeWarning;
import com.codet.lens.vis.dto.dataset.DebugSqlRequest;
import com.codet.lens.vis.dto.dataset.DebugSqlResponse;
import com.codet.lens.vis.dto.dataset.MetaInfo;
import com.codet.lens.vis.dto.dataset.QueryConfSqlRequest;
import com.codet.lens.vis.dto.dataset.VisCardRefInfo;
import com.codet.lens.vis.dto.dataset.VisDatasetInfo;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.codet.lens.vis.service.DatasetAdminService;
import com.codet.lens.vis.service.DatasourceAdminService;
import com.codet.lens.vis.service.DatasourceMetaService;
import com.codet.lens.vis.service.VisDatasetService;
import com.codet.lens.vis.VisPerms;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
public class DatasetController {

    private final VisDatasourceMapper datasourceMapper;
    private final DatasourceAdminService datasourceAdminService;
    private final DatasourceMetaService datasourceMetaService;
    private final DatasetAdminService datasetAdminService;
    private final VisDatasetService visDatasetService;

    @Tag(name = "DATASOURCE")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "listDatasourceOptions", summary = "数据源选项")
    @PostMapping("/datasources/{dsType}/options")
    public R<ListResponse<DsOption>> listDatasourceOptions(@PathVariable String dsType) {
        List<DsOption> list = datasourceMapper.selectList(null).stream()
                .filter(r -> Status.EBL.equals(r.getStatus()))
                .filter(r -> SqlDialect.supports(r.getDbType()))
                .map(r -> {
                    DsOption opt = new DsOption();
                    opt.setType("RDS");
                    opt.setCategory(r.getDbType());
                    opt.setName(r.getSourceName());
                    opt.setValue(r.getId());
                    return opt;
                })
                .toList();
        return R.success(new ListResponse<>(list));
    }

    @Tag(name = "DATASOURCE")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "listDatasourceTables", summary = "数据表选项")
    @GetMapping("/datasources/{sourceName}/tables")
    public R<ListResponse<NameValue>> listDatasourceTables(@PathVariable String sourceName) {
        List<NameValue> list = datasourceMetaService.listTables(sourceName).stream()
                .map(option -> {
                    NameValue item = new NameValue();
                    item.setName(option.name());
                    item.setValue(option.value());
                    return item;
                })
                .toList();
        return R.success(new ListResponse<>(list));
    }

    @Tag(name = "DATASOURCE")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "getDatasourceMetaTree", summary = "元数据树")
    @GetMapping("/datasources/{sourceName}/meta-tree")
    public R<ListResponse<MetaInfo.SchemaInfo>> getDatasourceMetaTree(
            @PathVariable String sourceName,
            @RequestParam(required = false) String tables) {
        return R.success(new ListResponse<>(datasourceMetaService.getMetaTree(sourceName, tables)));
    }

    @Tag(name = "DATASOURCE")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "editDatasource", summary = "新建或编辑数据源")
    @PostMapping("/datasources/edit")
    public R<Long> editDatasource(@RequestBody VisDatasource body) {
        return R.success(datasourceAdminService.save(body));
    }

    @Tag(name = "DATASET")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "queryDatasets", summary = "分页查询数据集")
    @PostMapping("/datasets/query")
    public R<PageResponse<ConfSqlInfo>> queryDatasets(@RequestBody QueryConfSqlRequest request) {
        return R.success(datasetAdminService.query(request));
    }

    @Tag(name = "DATASET")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "getDatasetDetail", summary = "数据集详情")
    @GetMapping("/datasets/detail")
    public R<ConfSqlInfo> getDatasetDetail(@NotNull Long sqlId) {
        return R.success(datasetAdminService.detail(sqlId));
    }

    @Tag(name = "DATASET")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "editDatasetInfo", summary = "新建或编辑数据集信息")
    @PostMapping("/datasets/edit-info")
    public R<DatasetSourceChangeWarning> editDatasetInfo(@Validated @RequestBody ConfSqlInfoRequest request) {
        datasetAdminService.saveInfo(request);
        return R.success();
    }

    @Tag(name = "DATASET")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "editDatasetContent", summary = "编辑数据集脚本和字段")
    @PostMapping("/datasets/edit-content")
    public R<Void> editDatasetContent(@Validated @RequestBody ConfSqlContentRequest request) {
        datasetAdminService.saveContent(request);
        return R.success();
    }

    @Tag(name = "DATASET")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "listDatasetCards", summary = "查询引用数据集的卡片")
    @GetMapping("/datasets/cards")
    public R<ListResponse<VisCardRefInfo>> listDatasetCards(@NotNull Long datasetId) {
        return R.success(datasetAdminService.listRefCards(datasetId));
    }

    @Tag(name = "DATASET")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "delDataset", summary = "删除数据集")
    @PostMapping("/datasets/del")
    public R<Void> delDataset(@Validated @RequestBody IdsRequest request) {
        datasetAdminService.delete(request.getIds());
        return R.success();
    }

    @Tag(name = "DATASET")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "listDatasetFields", summary = "查询数据集字段")
    @GetMapping("/datasets/fields")
    public R<List<ConfSqlFieldInfo>> listDatasetFields(@NotNull Long sqlId) {
        return R.success(datasetAdminService.listFields(sqlId));
    }

    @Tag(name = "DATASET")
    @Permission(VisPerms.VIS_DATASET_CONF)
    @Operation(operationId = "debugDataset", summary = "调试数据集脚本")
    @PostMapping("/datasets/debug")
    public R<DebugSqlResponse> debugDataset(@Validated @RequestBody DebugSqlRequest request) {
        DebugSqlResponse response = datasetAdminService.debug(request);
        if (response.getStackTrace() != null) {
            return R.fail(ResultEnum.FAIL.getCode(), ResultEnum.FAIL.getMsg(), response);
        }
        return R.success(response);
    }

    @Tag(name = "DATASET")
    @Operation(operationId = "listDatasetOptions", summary = "数据集选项")
    @Permission({VisPerms.VIS_CARD_CONF, VisPerms.VIS_DASHBOARD_CONF})
    @GetMapping("/datasets/options")
    public R<ListResponse<VisDatasetInfo>> listDatasetOptions(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long selectedId,
            @RequestParam(required = false) Integer limit) {
        return R.success(visDatasetService.listOptions(keyword, selectedId, limit));
    }

    @Tag(name = "DATASET")
    @Operation(operationId = "listDatasetFieldsById", summary = "数据集字段")
    @Permission({VisPerms.VIS_CARD_CONF, VisPerms.VIS_DASHBOARD_CONF})
    @GetMapping("/datasets/{datasetId}/fields")
    public R<List<ConfSqlFieldInfo>> listDatasetFieldsById(
            @NotNull(message = "datasetId不能为空") @PathVariable Long datasetId) {
        return R.success(visDatasetService.listFields(datasetId));
    }

    @Getter
    @Setter
    public static class DsOption {
        private String type;
        private String category;
        private String name;
        private Long value;
    }

    @Getter
    @Setter
    public static class NameValue {
        private String name;
        private String value;
    }
}
