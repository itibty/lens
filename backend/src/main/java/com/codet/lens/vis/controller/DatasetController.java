package com.codet.lens.vis.controller;

import com.codet.lens.auth.Permission;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.IdsRequest;
import com.codet.lens.common.ListResponse;
import com.codet.lens.common.PageResponse;
import com.codet.lens.common.PermCodes;
import com.codet.lens.common.R;
import com.codet.lens.common.ResultEnum;
import com.codet.lens.vis.dto.dataset.VisDatasetInfo;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.codet.lens.vis.rds.core.DatasourceRegistry;
import com.codet.lens.vis.rds.dto.conf.ConfSqlContentRequest;
import com.codet.lens.vis.rds.dto.conf.ConfSqlFieldInfo;
import com.codet.lens.vis.rds.dto.conf.ConfSqlFieldSaveRequest;
import com.codet.lens.vis.rds.dto.conf.ConfSqlInfo;
import com.codet.lens.vis.rds.dto.conf.ConfSqlInfoRequest;
import com.codet.lens.vis.rds.dto.conf.DebugSqlRequest;
import com.codet.lens.vis.rds.dto.conf.DebugSqlResponse;
import com.codet.lens.vis.rds.dto.conf.QueryConfSqlRequest;
import com.codet.lens.vis.service.DatasetAdminService;
import com.codet.lens.vis.service.VisDatasetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotNull;
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

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

@RestController
@Validated
@RequiredArgsConstructor
public class DatasetController {

    private final VisDatasourceMapper datasourceMapper;
    private final DatasourceRegistry datasourceRegistry;
    private final DatasetAdminService datasetAdminService;
    private final VisDatasetService visDatasetService;

    @Tag(name = "DATASOURCE")
    @Permission(PermCodes.VIS_DATASET_CONF)
    @Operation(operationId = "listDatasourceOptions", summary = "数据源选项")
    @PostMapping("/datasources/{dsType}/options")
    public R<ListResponse<DsOption>> listDatasourceOptions(@PathVariable String dsType) {
        List<DsOption> list = datasourceMapper.selectList(null).stream()
                .filter(r -> FieldConst.EBL.equals(r.getStatus()))
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
    @Permission(PermCodes.VIS_DATASET_CONF)
    @Operation(operationId = "listDatasourceTables", summary = "数据表选项")
    @GetMapping("/datasources/{sourceName}/tables")
    public R<ListResponse<NameValue>> listDatasourceTables(@PathVariable String sourceName) {
        List<NameValue> list = new ArrayList<>();
        try {
            DataSource ds = datasourceRegistry.raw(sourceName);
            try (Connection conn = ds.getConnection()) {
                DatabaseMetaData meta = conn.getMetaData();
                String catalog = conn.getCatalog();
                try (ResultSet rs = meta.getTables(catalog, null, "%", new String[]{"TABLE", "VIEW"})) {
                    while (rs.next()) {
                        String table = rs.getString("TABLE_NAME");
                        NameValue nv = new NameValue();
                        nv.setName(table);
                        nv.setValue(catalog == null ? table : catalog + "." + table);
                        list.add(nv);
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return R.success(new ListResponse<>(list));
    }

    @Tag(name = "DATASOURCE")
    @Permission(PermCodes.VIS_DATASET_CONF)
    @Operation(operationId = "getDatasourceMetaTree", summary = "元数据树")
    @GetMapping("/datasources/{sourceName}/meta-tree")
    public R<ListResponse<Object>> getDatasourceMetaTree(
            @PathVariable String sourceName,
            @RequestParam(required = false) String tables) {
        return R.success(new ListResponse<>(List.of()));
    }

    @Tag(name = "DATASOURCE")
    @Permission(PermCodes.VIS_DATASET_CONF)
    @Operation(operationId = "editDatasource", summary = "新建或编辑数据源")
    @PostMapping("/datasources/edit")
    public R<Long> editDatasource(@RequestBody VisDatasource body) {
        if (body.getId() == null) {
            body.setStatus(FieldConst.EBL);
            body.createCallback();
            datasourceMapper.insert(body);
        } else {
            body.modifyCallback();
            datasourceMapper.updateById(body);
        }
        datasourceRegistry.refresh(datasourceMapper.selectById(body.getId()));
        return R.success(body.getId());
    }

    @Tag(name = "DATASET")
    @Permission(PermCodes.VIS_DATASET_CONF)
    @Operation(operationId = "queryDatasets", summary = "分页查询数据集")
    @PostMapping("/datasets/query")
    public R<PageResponse<ConfSqlInfo>> queryDatasets(@RequestBody QueryConfSqlRequest request) {
        return R.success(datasetAdminService.query(request));
    }

    @Tag(name = "DATASET")
    @Permission(PermCodes.VIS_DATASET_CONF)
    @Operation(operationId = "getDatasetDetail", summary = "数据集详情")
    @GetMapping("/datasets/detail")
    public R<ConfSqlInfo> getDatasetDetail(@NotNull Long sqlId) {
        return R.success(datasetAdminService.detail(sqlId));
    }

    @Tag(name = "DATASET")
    @Permission(PermCodes.VIS_DATASET_CONF)
    @Operation(operationId = "editDatasetInfo", summary = "新建或编辑数据集信息")
    @PostMapping("/datasets/edit-info")
    public R<Void> editDatasetInfo(@Validated @RequestBody ConfSqlInfoRequest request) {
        datasetAdminService.saveInfo(request);
        return R.success();
    }

    @Tag(name = "DATASET")
    @Permission(PermCodes.VIS_DATASET_CONF)
    @Operation(operationId = "editDatasetContent", summary = "编辑数据集脚本")
    @PostMapping("/datasets/edit-content")
    public R<Void> editDatasetContent(@Validated @RequestBody ConfSqlContentRequest request) {
        datasetAdminService.saveContent(request);
        return R.success();
    }

    @Tag(name = "DATASET")
    @Permission(PermCodes.VIS_DATASET_CONF)
    @Operation(operationId = "delDataset", summary = "删除数据集")
    @PostMapping("/datasets/del")
    public R<Void> delDataset(@Validated @RequestBody IdsRequest request) {
        datasetAdminService.delete(request.getIds());
        return R.success();
    }

    @Tag(name = "DATASET")
    @Permission(PermCodes.VIS_DATASET_CONF)
    @Operation(operationId = "listDatasetFields", summary = "查询数据集字段")
    @GetMapping("/datasets/fields")
    public R<List<ConfSqlFieldInfo>> listDatasetFields(@NotNull Long sqlId) {
        return R.success(datasetAdminService.listFields(sqlId));
    }

    @Tag(name = "DATASET")
    @Permission(PermCodes.VIS_DATASET_CONF)
    @Operation(operationId = "editDatasetFields", summary = "覆盖保存数据集字段")
    @PostMapping("/datasets/edit-fields")
    public R<Void> editDatasetFields(@Validated @RequestBody ConfSqlFieldSaveRequest request) {
        datasetAdminService.saveFields(request);
        return R.success();
    }

    @Tag(name = "DATASET")
    @Permission(PermCodes.VIS_DATASET_CONF)
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
    @Permission(PermCodes.VIS_CARD_CONF)
    @GetMapping("/datasets/options")
    public R<ListResponse<VisDatasetInfo>> listDatasetOptions() {
        return R.success(visDatasetService.listOptions());
    }

    @Tag(name = "DATASET")
    @Operation(operationId = "listDatasetFieldsById", summary = "数据集字段")
    @Permission(PermCodes.VIS_CARD_CONF)
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
