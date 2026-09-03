package com.codet.lens.vis.service;

import cn.hutool.core.collection.CollUtil;
import com.alibaba.excel.EasyExcel;
import com.alibaba.excel.ExcelWriter;
import com.alibaba.excel.write.metadata.WriteSheet;
import com.codet.lens.common.base.ResultEnum;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.core.query.*;
import com.codet.lens.vis.dto.query.DetailQueryRequest;
import com.codet.lens.vis.dto.query.QueryConfig;
import com.codet.lens.vis.dto.query.QueryDataResponse;
import com.codet.lens.vis.dto.query.QueryRequest;
import com.codet.lens.vis.dto.dataset.ConfSqlFieldInfo;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class VisDataService {

    private final VisDatasetService visDatasetService;

    private static final int EXPORT_BATCH_SIZE = 1000;
    private static final int EXPORT_MAX_BATCHES = 200;
    private static final int QUERY_MAX_ROWS = 5000;
    private static final int QUERY_PROBE_ROWS = QUERY_MAX_ROWS + 1;

    public QueryDataResponse query(QueryRequest request) {
        QueryContext ctx = new QueryContext(QUERY_MAX_ROWS, 1000);
        ctx.setShowSql(VisExecSql.showSql());
        QueryContextHolder.set(ctx);
        try {
            VisQueryPrep.Prepared prepared = VisQueryPrep.prepare(request);
            VisDatasetService.Ready dataset = openDataset(request.getQuery().getDatasetId(), request);
            SqlConf sqlConf = dataset.getSqlConf();
            QueryBO query = toQuery(request, sqlConf, prepared);
            configureResultLimit(query, request.getQuery().getLimit());

            SqlBuilder.SqlRet sqlRet;
            ContrastSqlAssembler.Result contrastRet = null;
            if (ContrastSqlAssembler.hasContrast(query.getMetrics())) {
                contrastRet = ContrastSqlAssembler.build(query);
                sqlRet = contrastRet.getSqlRet();
                ctx.setNextSqlName("contrast");
            } else {
                sqlRet = SqlBuilder.build(query);
                ctx.setNextSqlName("main");
            }

            List<Map<String, Object>> rows = RdsUtil.selectList(
                    new SqlTplRet(null, sqlConf.getDsName(), sqlRet.getSql(), sqlRet.getParams())
            );

            List<String> columns = deriveColumns(rows, query);

            QueryDataResponse result = new QueryDataResponse();
            result.setColumns(columns);
            result.setRows(rows);
            result.setTotal(rows.size());
            result.setTruncated(ctx.isTruncated());
            result.setExecSqls(VisExecSql.listOrNull(ctx));
            if (contrastRet != null) {
                result.setAsOfDate(contrastRet.getAsOfDate());
                result.setContrasts(contrastRet.getContrasts());
            }
            return result;
        } catch (Exception e) {
            throw VisExecSql.wrap(e, ctx);
        } finally {
            QueryContextHolder.remove();
        }
    }

    public QueryDataResponse queryDetail(DetailQueryRequest request) {
        QueryContext ctx = new QueryContext(QUERY_MAX_ROWS, 1000);
        ctx.setShowSql(VisExecSql.showSql());
        QueryContextHolder.set(ctx);
        try {
            VisQueryPrep.Prepared prepared = VisQueryPrep.prepareDetail(request);
            VisDatasetService.Ready dataset = openDataset(request.getQuery().getDatasetId(), request);
            SqlConf sqlConf = dataset.getSqlConf();
            List<String> fields = detailFields(dataset.getFields());
            QueryBO query = toDetailQuery(sqlConf, prepared, fields, request.getQuery().getLimit());
            configureResultLimit(query, request.getQuery().getLimit());
            ctx.setNextSqlName("detail");
            SqlBuilder.SqlRet sqlRet = SqlBuilder.build(query);
            List<Map<String, Object>> rows = RdsUtil.selectList(
                    new SqlTplRet(null, sqlConf.getDsName(), sqlRet.getSql(), sqlRet.getParams())
            );
            QueryDataResponse result = new QueryDataResponse();
            result.setColumns(CollUtil.isNotEmpty(rows) ? new ArrayList<>(rows.get(0).keySet()) : fields);
            result.setRows(rows);
            result.setTotal(rows.size());
            result.setTruncated(ctx.isTruncated());
            result.setExecSqls(VisExecSql.listOrNull(ctx));
            return result;
        } catch (Exception e) {
            throw VisExecSql.wrap(e, ctx);
        } finally {
            QueryContextHolder.remove();
        }
    }

    public void export(QueryRequest request, OutputStream out) {
        try {
            VisQueryPrep.Prepared prepared = VisQueryPrep.prepare(request);
            VisDatasetService.Ready dataset = openDataset(request.getQuery().getDatasetId(), request);
            QueryBO query = toQuery(request, dataset.getSqlConf(), prepared);
            doExport(dataset.getSqlConf(), query, out);
        } catch (ResultException e) {
            throw e;
        } catch (Exception e) {
            log.warn("vis export failed", e);
            throw new ResultException(ResultEnum.FAIL.getCode(), VisExecSql.QUERY_FAIL);
        }
    }

    private VisDatasetService.Ready openDataset(Long datasetId, QueryRequest request) {
        VisDatasetService.Ready dataset = visDatasetService.loadReady(datasetId);
        VisCatalogCheck.check(dataset.getFields(), dataset.getSqlConf().getSqlName(), request);
        return dataset;
    }

    private VisDatasetService.Ready openDataset(Long datasetId, DetailQueryRequest request) {
        VisDatasetService.Ready dataset = visDatasetService.loadReady(datasetId);
        VisCatalogCheck.check(dataset.getFields(), dataset.getSqlConf().getSqlName(), request);
        return dataset;
    }

    private void doExport(SqlConf sqlConf, QueryBO query, OutputStream out) {
        query.setSkipLimit(true);
        SqlBuilder.SqlRet sqlRet = ContrastSqlAssembler.hasContrast(query.getMetrics())
                ? ContrastSqlAssembler.build(query).getSqlRet()
                : SqlBuilder.build(query);
        String baseSql = sqlRet.getSql();
        Object[] baseParams = sqlRet.getParams();

        if (!baseSql.toUpperCase().contains(" ORDER BY ")) {
            baseSql += " ORDER BY 1";
        }

        writeToExcel(baseSql, baseParams, sqlConf.getDsName(), query, out);
    }

    private QueryBO toQuery(QueryRequest request, SqlConf sqlConf, VisQueryPrep.Prepared prepared) {
        QueryConfig config = request.getQuery();
        SqlTplRet tplRet = visDatasetService.resolveTpl(sqlConf, prepared.getEnjoyParams());
        QueryBO query = new QueryBO();
        query.setDimensions(config.getDimensions());
        query.setMetrics(config.getMetrics());
        query.setHavingFilters(config.getHavingFilters());
        query.setResultFilters(config.getResultFilters());
        query.setOrderList(config.getOrderList());
        query.setInnerSql(tplRet.getSql());
        query.setInnerParams(tplRet.getParams());
        query.setFilters(prepared.getFilters());
        query.setAsOfDate(prepared.getAsOfDate());
        query.setDialect(SqlDialect.of(sqlConf.getDsType()));
        return query;
    }

    private QueryBO toDetailQuery(SqlConf sqlConf, VisQueryPrep.Prepared prepared, List<String> fields,
                                  Integer limit) {
        SqlTplRet tplRet = visDatasetService.resolveTpl(sqlConf, prepared.getEnjoyParams());
        QueryBO query = new QueryBO();
        query.setSelectFields(fields);
        query.setSkipHaving(true);
        query.setSkipOrder(true);
        query.setLimit(limit);
        query.setInnerSql(tplRet.getSql());
        query.setInnerParams(tplRet.getParams());
        query.setFilters(prepared.getFilters());
        query.setAsOfDate(prepared.getAsOfDate());
        query.setDialect(SqlDialect.of(sqlConf.getDsType()));
        return query;
    }

    static void configureResultLimit(QueryBO query, Integer requestedLimit) {
        // 达到系统上限时让 SQL 多返回一行，RdsUtil 用它准确判断 truncated。
        query.setMaxLimit(QUERY_PROBE_ROWS);
        query.setLimit(requestedLimit == null || requestedLimit >= QUERY_MAX_ROWS
                ? QUERY_PROBE_ROWS
                : requestedLimit);
    }

    private List<String> detailFields(List<ConfSqlFieldInfo> saved) {
        List<String> fields = new ArrayList<>();
        for (ConfSqlFieldInfo info : CollUtil.emptyIfNull(saved)) {
            if (info != null && info.getField() != null && !info.getField().trim().isEmpty()) {
                fields.add(info.getField().trim());
            }
        }
        return fields;
    }

    private List<String> deriveColumns(List<Map<String, Object>> rows, QueryBO query) {
        if (CollUtil.isNotEmpty(rows)) {
            return new ArrayList<>(rows.get(0).keySet());
        }
        return columnAliases(query);
    }

    private void writeToExcel(String baseSql, Object[] baseParams, String dsName, QueryBO query, OutputStream out) {
        int offset = 0;
        boolean hasData = false;

        ExcelWriter excelWriter = EasyExcel.write(out).build();
        WriteSheet sheet = null;

        try {
            for (int batch = 0; batch < EXPORT_MAX_BATCHES; batch++) {
                String batchSql = query.dialectOrDefault().paginate(baseSql, offset, EXPORT_BATCH_SIZE);
                SqlTplRet batchTpl = new SqlTplRet(null, dsName, batchSql, baseParams);

                QueryContextHolder.set(new QueryContext(EXPORT_BATCH_SIZE, EXPORT_BATCH_SIZE));
                List<Map<String, Object>> rows;
                try {
                    rows = RdsUtil.selectList(batchTpl);
                } finally {
                    QueryContextHolder.remove();
                }

                if (rows.isEmpty()) {
                    break;
                }

                if (!hasData) {
                    List<List<String>> head = new ArrayList<>();
                    for (String col : rows.get(0).keySet()) {
                        head.add(Collections.singletonList(col));
                    }
                    log.info("导出开始 [dsName={}, columns={}]", dsName, head.size());
                    sheet = EasyExcel.writerSheet("数据").build();
                    sheet.setHead(head);
                    hasData = true;
                }

                List<List<Object>> data = new ArrayList<>(rows.size());
                for (Map<String, Object> row : rows) {
                    data.add(new ArrayList<>(row.values()));
                }
                excelWriter.write(data, sheet);

                if (rows.size() < EXPORT_BATCH_SIZE) {
                    break;
                }
                offset += EXPORT_BATCH_SIZE;
            }

            if (!hasData) {
                List<List<String>> head = buildHeadFromQuery(query);
                sheet = EasyExcel.writerSheet("数据").build();
                sheet.setHead(head);
            }
        } finally {
            excelWriter.finish();
        }
        log.info("导出完成 [dsName={}]", dsName);
    }

    private List<List<String>> buildHeadFromQuery(QueryBO query) {
        List<List<String>> head = new ArrayList<>();
        for (String col : columnAliases(query)) {
            head.add(Collections.singletonList(col));
        }
        return head;
    }

    private List<String> columnAliases(QueryBO query) {
        if (CollUtil.isNotEmpty(query.getSelectFields())) {
            return new ArrayList<>(query.getSelectFields());
        }
        List<String> names = new ArrayList<>();
        if (CollUtil.isNotEmpty(query.getDimensions())) {
            query.getDimensions().stream().map(SqlExprHelper::resolveDimAlias).forEach(names::add);
        }
        if (CollUtil.isNotEmpty(query.getMetrics())) {
            query.getMetrics().stream().map(SqlExprHelper::resolveMetricAlias).forEach(names::add);
        }
        return names;
    }

}
