package com.codet.lens.vis.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.codet.lens.common.base.ListResponse;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.core.query.RdsUtil;
import com.codet.lens.vis.core.query.SqlConf;
import com.codet.lens.vis.core.query.SqlTplPara;
import com.codet.lens.vis.core.query.SqlTplRet;
import com.codet.lens.vis.dto.dataset.ConfSqlFieldInfo;
import com.codet.lens.vis.dto.dataset.VisDatasetInfo;
import com.codet.lens.vis.entity.VisDataset;
import com.codet.lens.vis.entity.VisDatasetField;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasetFieldMapper;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VisDatasetService {

    private static final int DEFAULT_OPTION_LIMIT = 50;
    private static final int MAX_OPTION_LIMIT = 100;

    private final VisDatasetMapper datasetMapper;
    private final VisDatasetFieldMapper fieldMapper;
    private final VisDatasourceMapper datasourceMapper;

    public ListResponse<VisDatasetInfo> listOptions(String keyword, Long selectedId, Integer limit) {
        String search = StrUtil.trim(keyword);
        QueryWrapper<VisDataset> query = new QueryWrapper<VisDataset>()
                .eq("status", Status.EBL)
                .orderByDesc("id")
                .select("id", "dataset_name", "dataset_desc");
        if (StrUtil.isNotBlank(search)) {
            Long searchId = parseId(search);
            query.and(wrapper -> {
                wrapper.like("dataset_name", search).or().like("dataset_desc", search);
                if (searchId != null) {
                    wrapper.or().eq("id", searchId);
                }
            });
        }
        List<VisDatasetInfo> list = datasetMapper.selectPage(
                        new Page<>(1, resolveOptionLimit(limit), false), query)
                .getRecords().stream()
                .map(VisDatasetService::toInfo)
                .collect(Collectors.toCollection(ArrayList::new));
        if (selectedId != null && list.stream().noneMatch(item -> selectedId.equals(item.getId()))) {
            VisDataset selected = datasetMapper.selectById(selectedId);
            if (selected != null && Status.EBL.equals(selected.getStatus())) {
                list.add(0, toInfo(selected));
            }
        }
        return new ListResponse<>(list);
    }

    static int resolveOptionLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_OPTION_LIMIT;
        }
        return Math.min(limit, MAX_OPTION_LIMIT);
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
                        .eq(VisDatasetField::getStatus, Status.EBL)
                        .orderByAsc(VisDatasetField::getSortNum))
                .stream()
                .map(row -> {
                    ConfSqlFieldInfo info = new ConfSqlFieldInfo();
                    info.setField(row.getField());
                    info.setDataType(row.getDataType());
                    info.setSuggestRole(row.getSuggestRole());
                    info.setRemark(row.getRemark());
                    return info;
                })
                .toList();
    }

    private SqlConf toSqlConf(VisDataset row) {
        VisDatasource source = datasourceMapper.selectById(row.getSourceId());
        if (source == null || !Status.EBL.equals(source.getStatus())) {
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
        if (row == null || Status.DEL.equals(row.getStatus())) {
            throw ResultException.fail("数据集已不可用");
        }
        if (Status.DBL.equals(row.getStatus())) {
            throw ResultException.fail(datasetLabel(row) + "已停用");
        }
        return row;
    }

    private static String datasetLabel(VisDataset row) {
        return StrUtil.isBlank(row.getDatasetName()) ? "数据集" : "数据集「" + row.getDatasetName() + "」";
    }

    private static Long parseId(String value) {
        try {
            return Long.valueOf(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static VisDatasetInfo toInfo(VisDataset row) {
        VisDatasetInfo info = new VisDatasetInfo();
        info.setId(row.getId());
        info.setSqlName(row.getDatasetName());
        info.setSqlDesc(row.getDatasetDesc());
        return info;
    }

    @Getter
    @RequiredArgsConstructor
    public static class Ready {
        private final SqlConf sqlConf;
        private final List<ConfSqlFieldInfo> fields;
        private final String sqlParams;
    }
}
