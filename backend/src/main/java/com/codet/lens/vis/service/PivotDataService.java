package com.codet.lens.vis.service;

import cn.hutool.core.collection.CollUtil;
import com.codet.lens.vis.core.pivot.PivotGrains;
import com.codet.lens.vis.core.pivot.PivotResultAssembler;
import com.codet.lens.vis.core.query.*;
import com.codet.lens.vis.dto.item.DimensionItem;
import com.codet.lens.vis.dto.item.MetricItem;
import com.codet.lens.vis.dto.pivot.PivotQueryConfig;
import com.codet.lens.vis.dto.pivot.PivotQueryRequest;
import com.codet.lens.vis.dto.pivot.PivotQueryResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** 透视查数。HAVING 只过滤最细交叉格；有 orderList 时组装保持明细 SQL 行序。 */
@Service
@RequiredArgsConstructor
public class PivotDataService {

    public static final int DEFAULT_LIMIT = 20000;
    public static final int MAX_LIMIT = 50000;

    private final VisDatasetService visDatasetService;

    public PivotQueryResponse query(PivotQueryRequest request) {
        QueryContext ctx = new QueryContext(DEFAULT_LIMIT, 1000);
        ctx.setShowSql(VisExecSql.showSql());
        QueryContextHolder.set(ctx);
        try {
            VisQueryPrep.Prepared prepared = VisQueryPrep.preparePivot(request);
            PivotQueryConfig config = request.getQuery();
            VisDatasetService.Ready dataset = visDatasetService.loadReady(config.getDatasetId());
            VisCatalogCheck.check(dataset.getFields(), dataset.getSqlConf().getSqlName(), request);
            SqlConf sqlConf = dataset.getSqlConf();
            SqlTplRet tplRet = visDatasetService.resolveTpl(sqlConf, prepared.getEnjoyParams());

            List<DimensionItem> rowDims = CollUtil.emptyIfNull(config.getRowDimensions());
            List<DimensionItem> colDims = CollUtil.emptyIfNull(config.getColDimensions());
            List<PivotGrains.Grain> grains = PivotGrains.of(rowDims, colDims, request.getVisual());
            Integer limit = config.getLimit();
            int maxRows = limit == null ? DEFAULT_LIMIT : Math.min(Math.max(limit, 1), MAX_LIMIT);

            List<Map<String, Object>> longRows = new ArrayList<>();
            boolean truncated = false;
            for (PivotGrains.Grain grain : grains) {
                QueryBO bo = grainBo(config, prepared, tplRet, grain, maxRows, sqlConf.getDsType());
                SqlBuilder.SqlRet sqlRet = SqlBuilder.build(bo);
                ctx.setMaxRows(grain.isDetail() ? maxRows : Math.max(maxRows, 1000));
                ctx.setTruncated(false);
                ctx.setNextSqlName("row" + grain.getRowLevel() + "_col" + grain.getColLevel());
                List<Map<String, Object>> rows = RdsUtil.selectList(
                        new SqlTplRet(null, sqlConf.getDsName(), sqlRet.getSql(), sqlRet.getParams())
                );
                if (grain.isDetail() && ctx.isTruncated()) {
                    truncated = true;
                }
                longRows.addAll(rows);
            }

            List<String> metricAliases = new ArrayList<>();
            for (MetricItem metric : CollUtil.emptyIfNull(config.getMetrics())) {
                metricAliases.add(SqlExprHelper.resolveMetricAlias(metric));
            }
            PivotResultAssembler.Result assembled = PivotResultAssembler.toResult(
                    longRows, aliases(rowDims), aliases(colDims), metricAliases,
                    CollUtil.isNotEmpty(config.getOrderList())
            );

            PivotQueryResponse response = new PivotQueryResponse();
            response.setRowFields(assembled.rowFields);
            response.setColumnFields(assembled.columnFields);
            response.setMetrics(assembled.metrics);
            response.setColumns(assembled.columns);
            response.setRows(assembled.rows);
            response.setTotal(assembled.rows.size());
            response.setColumnTruncated(assembled.columnTruncated);
            response.setTruncated(truncated);
            response.setExecSqls(VisExecSql.listOrNull(ctx));
            return response;
        } catch (Exception e) {
            throw VisExecSql.wrap(e, ctx);
        } finally {
            QueryContextHolder.remove();
        }
    }

    private static QueryBO grainBo(PivotQueryConfig config, VisQueryPrep.Prepared prepared, SqlTplRet tplRet,
                                   PivotGrains.Grain grain, int maxRows, String dsType) {
        QueryBO bo = new QueryBO();
        bo.setDimensions(grain.allDims());
        bo.setMetrics(config.getMetrics());
        bo.setFilters(prepared.getFilters());
        bo.setAsOfDate(prepared.getAsOfDate());
        bo.setInnerSql(tplRet.getSql());
        bo.setInnerParams(tplRet.getParams());
        bo.setDialect(SqlDialect.of(dsType));
        applyDetailDisplayControls(bo, grain.isDetail(), config, maxRows);
        return bo;
    }

    /**
     * 透视 A1：HAVING / ORDER / LIMIT 只装饰最细交叉格（展示过滤）。
     * 小计、总计按同一 WHERE 在更粗粒度上重算真值，不再套 HAVING。
     */
    static void applyDetailDisplayControls(QueryBO bo, boolean detail, PivotQueryConfig config, int maxRows) {
        if (!detail) {
            bo.setSkipLimit(true);
            return;
        }
        bo.setHavingFilters(config.getHavingFilters());
        bo.setOrderList(config.getOrderList());
        // 显式小上限是用户意图；只有碰到系统上限时才多取一行探测截断。
        boolean systemCapped = config.getLimit() == null || config.getLimit() >= MAX_LIMIT;
        bo.setLimit(systemCapped ? maxRows + 1 : config.getLimit());
        bo.setMaxLimit(MAX_LIMIT + 1);
    }

    private static List<String> aliases(List<DimensionItem> dims) {
        List<String> aliases = new ArrayList<>();
        for (DimensionItem dim : dims) {
            aliases.add(SqlExprHelper.resolveDimAlias(dim));
        }
        return aliases;
    }
}
