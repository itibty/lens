package com.codet.lens.vis.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.ListResponse;
import com.codet.lens.common.ResultException;
import com.codet.lens.vis.dto.dataset.VisDatasetInfo;
import com.codet.lens.vis.entity.VisDataset;
import com.codet.lens.vis.entity.VisDatasetField;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasetFieldMapper;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.codet.lens.vis.rds.bo.SqlConf;
import com.codet.lens.vis.rds.bo.SqlTplPara;
import com.codet.lens.vis.rds.bo.SqlTplRet;
import com.codet.lens.vis.rds.core.RdsUtil;
import com.codet.lens.vis.rds.dto.conf.ConfSqlFieldInfo;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VisDatasetService {

    private static final int OPTION_LIMIT = 50;

    private final VisDatasetMapper datasetMapper;
    private final VisDatasetFieldMapper fieldMapper;
    private final VisDatasourceMapper datasourceMapper;

    public ListResponse<VisDatasetInfo> listOptions() {
        List<VisDatasetInfo> list = datasetMapper.selectPage(new Page<>(1, OPTION_LIMIT, false),
                        Wrappers.<VisDataset>lambdaQuery()
                                .eq(VisDataset::getStatus, FieldConst.EBL)
                                .orderByDesc(VisDataset::getId)
                                .select(VisDataset::getId, VisDataset::getDatasetName, VisDataset::getDatasetDesc))
                .getRecords().stream()
                .map(row -> {
                    VisDatasetInfo info = new VisDatasetInfo();
                    info.setId(row.getId());
                    info.setSqlName(row.getDatasetName());
                    info.setSqlDesc(row.getDatasetDesc());
                    return info;
                })
                .toList();
        return new ListResponse<>(list);
    }

    public List<ConfSqlFieldInfo> listFields(Long datasetId) {
        requireRow(datasetId);
        return listSavedFields(datasetId);
    }

    public Ready loadReady(Long datasetId) {
        VisDataset row = requireRow(datasetId);
        return new Ready(toSqlConf(row), listSavedFields(datasetId), row.getParamDemo());
    }

    public SqlTplRet resolveTpl(SqlConf sqlConf, Map<String, Object> enjoyParams) {
        return RdsUtil.getSqlTplRet(
                new SqlTplPara(sqlConf.getSqlId(), sqlConf.getDsName(), sqlConf.getSqlContent(), enjoyParams));
    }

    private List<ConfSqlFieldInfo> listSavedFields(Long datasetId) {
        return fieldMapper.selectList(Wrappers.<VisDatasetField>lambdaQuery()
                        .eq(VisDatasetField::getDatasetId, datasetId)
                        .eq(VisDatasetField::getStatus, FieldConst.EBL)
                        .orderByAsc(VisDatasetField::getSortNum))
                .stream()
                .map(row -> {
                    ConfSqlFieldInfo info = new ConfSqlFieldInfo();
                    info.setField(row.getField());
                    info.setDataType(row.getDataType());
                    info.setSuggestRole(row.getSuggestRole());
                    return info;
                })
                .toList();
    }

    private SqlConf toSqlConf(VisDataset row) {
        VisDatasource source = datasourceMapper.selectById(row.getSourceId());
        if (source == null || !FieldConst.EBL.equals(source.getStatus())) {
            throw ResultException.fail(datasetLabel(row) + "关联的数据源不可用");
        }
        SqlConf conf = new SqlConf();
        conf.setSqlId(row.getId());
        conf.setSqlName(row.getDatasetName());
        conf.setSqlContent(row.getSqlContent());
        conf.setDsId(source.getId());
        conf.setDsName(source.getSourceName());
        conf.setDsType(source.getDbType());
        return conf;
    }

    private VisDataset requireRow(Long datasetId) {
        VisDataset row = datasetId == null ? null : datasetMapper.selectById(datasetId);
        if (row == null || FieldConst.DEL.equals(row.getStatus())) {
            throw ResultException.fail("数据集已不可用");
        }
        if (FieldConst.DBL.equals(row.getStatus())) {
            throw ResultException.fail(datasetLabel(row) + "已停用");
        }
        return row;
    }

    private static String datasetLabel(VisDataset row) {
        return StrUtil.isBlank(row.getDatasetName()) ? "数据集" : "数据集「" + row.getDatasetName() + "」";
    }

    @Getter
    @RequiredArgsConstructor
    public static class Ready {
        private final SqlConf sqlConf;
        private final List<ConfSqlFieldInfo> fields;
        private final String sqlParams;
    }
}
