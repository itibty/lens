package com.codet.lens.vis.service;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.ConvertUtil;
import com.codet.lens.common.FieldConst;
import com.codet.lens.common.ListResponse;
import com.codet.lens.common.PageResponse;
import com.codet.lens.common.ResultEnum;
import com.codet.lens.common.ResultException;
import com.codet.lens.vis.dto.dataset.DatasetSourceChangeWarning;
import com.codet.lens.vis.dto.dataset.VisCardRefInfo;
import com.codet.lens.vis.entity.VisCard;
import com.codet.lens.vis.entity.VisDataset;
import com.codet.lens.vis.entity.VisDatasetField;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDatasetFieldMapper;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.codet.lens.vis.rds.bo.SqlColumnMeta;
import com.codet.lens.vis.rds.bo.SqlSelectResult;
import com.codet.lens.vis.rds.bo.SqlTplPara;
import com.codet.lens.vis.rds.bo.SqlTplRet;
import com.codet.lens.vis.rds.core.RdsUtil;
import com.codet.lens.vis.rds.dto.conf.ConfSqlContentRequest;
import com.codet.lens.vis.rds.dto.conf.ConfSqlFieldInfo;
import com.codet.lens.vis.rds.dto.conf.ConfSqlInfo;
import com.codet.lens.vis.rds.dto.conf.ConfSqlInfoRequest;
import com.codet.lens.vis.rds.dto.conf.DebugSqlColumn;
import com.codet.lens.vis.rds.dto.conf.DebugSqlRequest;
import com.codet.lens.vis.rds.dto.conf.DebugSqlResponse;
import com.codet.lens.vis.rds.dto.conf.QueryConfSqlRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DatasetAdminService {

    private final VisDatasetMapper datasetMapper;
    private final VisDatasetFieldMapper fieldMapper;
    private final VisDatasourceMapper datasourceMapper;
    private final VisCardMapper cardMapper;

    public PageResponse<ConfSqlInfo> query(QueryConfSqlRequest req) {
        IPage<VisDataset> page = datasetMapper.selectPage(req.getPage().toIPage(), Wrappers.<VisDataset>lambdaQuery()
                .ne(VisDataset::getStatus, FieldConst.DEL)
                .eq(req.getId() != null, VisDataset::getId, req.getId())
                .eq(req.getDsId() != null, VisDataset::getSourceId, req.getDsId())
                .eq(StrUtil.isNotBlank(req.getStatus()), VisDataset::getStatus, req.getStatus())
                .like(StrUtil.isNotBlank(req.getSqlName()), VisDataset::getDatasetName, req.getSqlName())
                .like(StrUtil.isNotBlank(req.getSqlDesc()), VisDataset::getDatasetDesc, req.getSqlDesc())
                .orderByDesc(VisDataset::getId));
        Map<Long, VisDatasource> sources = datasourceMapper.selectList(null).stream()
                .collect(Collectors.toMap(VisDatasource::getId, s -> s, (a, b) -> a));
        return ConvertUtil.toPageResponse(page.convert(row -> toInfo(row, sources.get(row.getSourceId()))));
    }

    public ConfSqlInfo detail(Long id) {
        VisDataset row = require(id);
        return toInfo(row, datasourceMapper.selectById(row.getSourceId()));
    }

    @Transactional
    public void saveInfo(ConfSqlInfoRequest req) {
        VisDataset row = req.getId() == null ? new VisDataset() : require(req.getId());
        if (datasourceMapper.selectById(req.getDsId()) == null) {
            throw ResultException.fail("数据源不存在");
        }
        boolean sourceChanged = req.getId() != null && !Objects.equals(row.getSourceId(), req.getDsId());
        if (sourceChanged && !Boolean.TRUE.equals(req.getConfirmSourceChange())) {
            List<VisCard> references = findRefCards(List.of(req.getId()));
            if (!references.isEmpty()) {
                DatasetSourceChangeWarning warning = new DatasetSourceChangeWarning();
                warning.setReferenceCount(references.size());
                warning.setCards(references.stream().limit(5).map(this::toCardRefInfo).toList());
                throw new ResultException(ResultEnum.FAIL.getCode(),
                        "更换数据源将影响 " + references.size() + " 张引用该数据集的卡片", warning);
            }
        }
        row.setSourceId(req.getDsId());
        row.setDatasetName(req.getSqlName());
        row.setDatasetDesc(req.getSqlDesc());
        row.setStatus(req.getStatus());
        if (req.getId() == null) {
            row.setSqlContent("select 1");
            row.createCallback();
            datasetMapper.insert(row);
        } else {
            row.modifyCallback();
            datasetMapper.updateById(row);
        }
    }

    @Transactional
    public void saveContent(ConfSqlContentRequest req) {
        VisDataset row = require(req.getId());
        row.setSqlContent(req.getSqlContent());
        row.setParamDemo(req.getSqlParams());
        row.modifyCallback();
        datasetMapper.updateById(row);
        replaceFields(req.getId(), req.getFields());
    }

    @Transactional
    public void delete(List<Long> ids) {
        List<VisDataset> datasets = new ArrayList<>();
        for (Long id : ids) {
            datasets.add(require(id));
        }
        List<VisCard> references = findRefCards(ids);
        if (!references.isEmpty()) {
            String names = references.stream()
                    .limit(5)
                    .map(VisCard::getCardName)
                    .collect(Collectors.joining("、"));
            String suffix = references.size() > 5 ? " 等" : "";
            throw ResultException.fail("数据集被 " + references.size()
                    + " 张卡片引用，请先处理卡片：" + names + suffix);
        }
        for (VisDataset row : datasets) {
            row.setStatus(FieldConst.DEL);
            row.modifyCallback();
            datasetMapper.updateById(row);
        }
    }

    public ListResponse<VisCardRefInfo> listRefCards(Long datasetId) {
        require(datasetId);
        List<VisCardRefInfo> list = findRefCards(List.of(datasetId)).stream()
                .map(this::toCardRefInfo)
                .toList();
        return new ListResponse<>(list);
    }

    public List<ConfSqlFieldInfo> listFields(Long sqlId) {
        require(sqlId);
        return fieldMapper.selectList(Wrappers.<VisDatasetField>lambdaQuery()
                        .eq(VisDatasetField::getDatasetId, sqlId)
                        .eq(VisDatasetField::getStatus, FieldConst.EBL)
                        .orderByAsc(VisDatasetField::getSortNum))
                .stream()
                .map(this::toField)
                .toList();
    }

    private void replaceFields(Long datasetId, List<ConfSqlFieldInfo> fields) {
        fieldMapper.delete(Wrappers.<VisDatasetField>query().eq("dataset_id", datasetId));
        int sort = 0;
        for (ConfSqlFieldInfo item : fields) {
            VisDatasetField row = new VisDatasetField();
            row.setDatasetId(datasetId);
            row.setField(item.getField());
            row.setDataType(item.getDataType());
            row.setSuggestRole(item.getSuggestRole());
            row.setRemark(normalizeRemark(item.getRemark()));
            row.setSortNum(sort++);
            row.setStatus(FieldConst.EBL);
            row.createCallback();
            fieldMapper.insert(row);
        }
    }

    public DebugSqlResponse debug(DebugSqlRequest req) {
        DebugSqlResponse resp = new DebugSqlResponse();
        try {
            VisDataset dataset = req.getId() == null ? null : require(req.getId());
            VisDatasource source = dataset == null ? null : datasourceMapper.selectById(dataset.getSourceId());
            if (source == null) {
                throw ResultException.fail("请先保存数据集并选择数据源");
            }
            SqlTplRet tpl = RdsUtil.getSqlTplRet(new SqlTplPara(req.getId(), source.getSourceName(),
                    req.getSqlContent(), req.getParams()));
            resp.setSql(tpl.getSql());
            resp.setParams(tpl.getParams());
            if (Boolean.TRUE.equals(req.getExecSql())) {
                SqlSelectResult result = RdsUtil.select(tpl);
                resp.setExecRet(result.getRows());
                List<DebugSqlColumn> cols = new ArrayList<>();
                for (SqlColumnMeta col : result.getColumns()) {
                    DebugSqlColumn item = new DebugSqlColumn();
                    item.setField(col.getField());
                    item.setJdbcType(col.getJdbcType());
                    item.setDataType(guessType(col.getJdbcType()));
                    item.setSuggestRole("NUMBER".equals(item.getDataType()) ? "METRIC" : "DIMENSION");
                    cols.add(item);
                }
                resp.setColumns(cols);
            }
        } catch (Exception e) {
            resp.setError(e.getMessage());
            StringWriter sw = new StringWriter();
            e.printStackTrace(new PrintWriter(sw));
            resp.setStackTrace(sw.toString());
        }
        return resp;
    }

    private ConfSqlInfo toInfo(VisDataset row, VisDatasource source) {
        ConfSqlInfo info = new ConfSqlInfo();
        info.setId(row.getId());
        info.setSqlName(row.getDatasetName());
        info.setSqlDesc(row.getDatasetDesc());
        info.setSqlContent(row.getSqlContent());
        info.setSqlParams(row.getParamDemo());
        info.setDsId(row.getSourceId());
        info.setDsName(source == null ? null : source.getSourceName());
        info.setStatus(row.getStatus());
        info.setTplEngine("ENJOY");
        return info;
    }

    private ConfSqlFieldInfo toField(VisDatasetField row) {
        ConfSqlFieldInfo info = new ConfSqlFieldInfo();
        info.setField(row.getField());
        info.setDataType(row.getDataType());
        info.setSuggestRole(row.getSuggestRole());
        info.setRemark(row.getRemark());
        return info;
    }

    private VisCardRefInfo toCardRefInfo(VisCard row) {
        VisCardRefInfo info = new VisCardRefInfo();
        info.setId(row.getId());
        info.setCardName(row.getCardName());
        info.setStatus(row.getStatus());
        return info;
    }

    private VisDataset require(Long id) {
        VisDataset row = datasetMapper.selectById(id);
        if (row == null || FieldConst.DEL.equals(row.getStatus())) {
            throw ResultException.fail("数据集不存在");
        }
        return row;
    }

    private List<VisCard> findRefCards(List<Long> datasetIds) {
        return cardMapper.selectList(Wrappers.<VisCard>query()
                .in("dataset_id", datasetIds)
                .ne("status", FieldConst.DEL)
                .select("id", "card_name", "dataset_id", "status")
                .orderByDesc("modify_at")
                .orderByDesc("id"));
    }

    private static String normalizeRemark(String remark) {
        String text = StrUtil.trim(remark);
        if (StrUtil.isEmpty(text)) {
            return null;
        }
        return text.length() > 200 ? text.substring(0, 200) : text;
    }

    private static String guessType(String jdbcType) {
        if (jdbcType == null) {
            return "STRING";
        }
        String t = jdbcType.toUpperCase();
        if (t.contains("INT") || t.contains("DEC") || t.contains("NUM") || t.contains("FLOAT") || t.contains("DOUBLE")) {
            return "NUMBER";
        }
        if (t.contains("DATE") && !t.contains("TIME")) {
            return "DATE";
        }
        if (t.contains("TIME") || t.contains("TIMESTAMP")) {
            return "DATETIME";
        }
        return "STRING";
    }
}
