package com.codet.lens.vis.service;

import cn.hutool.core.util.StrUtil;
import com.codet.lens.common.ResultEnum;
import com.codet.lens.common.ResultException;
import com.codet.lens.common.JsonUtil;
import com.codet.lens.vis.rds.bo.SqlConf;
import com.codet.lens.vis.rds.bo.SqlTplRet;
import com.codet.lens.vis.rds.core.QueryContext;
import com.codet.lens.vis.rds.core.QueryContextHolder;
import com.codet.lens.vis.rds.core.RdsUtil;
import com.codet.lens.vis.rds.util.SqlPageUtil;
import com.codet.lens.vis.core.query.SqlDialect;
import com.codet.lens.vis.core.query.VisExecSql;
import com.codet.lens.vis.core.query.VisFilterOptionNormalizer;
import com.codet.lens.vis.dto.dataset.VisFilterOptionItem;
import com.codet.lens.vis.dto.dataset.VisFilterOptionsRequest;
import com.codet.lens.vis.dto.dataset.VisFilterOptionsResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 筛选枚举：跑数据集 SQL，收成 {@code {label, value}}。
 * 预览 / 搜索走 LIMIT；传入 {@code values} 时按取值字段精确反查名称。
 * 模板仍可吃 {@code keyword}、{@code limit}。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VisFilterOptionsService {

    public static final int DEFAULT_LIMIT = 50;
    public static final int MAX_LIMIT = 200;
    /** SQL 未吃 keyword 时，先多取再内存过滤 */
    private static final int KEYWORD_FETCH_CAP = 2000;

    private final VisDatasetService visDatasetService;

    public VisFilterOptionsResponse list(VisFilterOptionsRequest request) {
        List<String> values = VisFilterOptionNormalizer.cleanValues(request.getValues());
        boolean byValue = !values.isEmpty();
        String field = StrUtil.trim(request.getField());
        if (byValue && StrUtil.isBlank(field)) {
            throw new ResultException(ResultEnum.FAIL.getCode(), "按值查询需要指定取值字段");
        }
        int limit = byValue ? values.size() : resolveLimit(request.getLimit());
        String keyword = byValue ? "" : StrUtil.trim(request.getKeyword());
        int fetchCap = !byValue && StrUtil.isNotBlank(keyword) ? Math.max(limit + 1, KEYWORD_FETCH_CAP) : limit + 1;
        QueryContext ctx = new QueryContext(5000, 1000);
        ctx.setShowSql(VisExecSql.showSql());
        QueryContextHolder.set(ctx);
        try {
            VisDatasetService.Ready dataset = visDatasetService.loadReady(request.getDatasetId());
            SqlConf sqlConf = dataset.getSqlConf();
            Map<String, Object> enjoy = exampleParams(dataset.getSqlParams());
            if (StrUtil.isNotBlank(keyword)) {
                enjoy.put("keyword", keyword);
            }
            enjoy.put("limit", limit);
            ctx.setNextSqlName("filter-options");
            SqlTplRet tplRet = visDatasetService.resolveTpl(sqlConf, enjoy);
            if (byValue) {
                tplRet = applyValueFilter(tplRet, sqlConf.getDsType(), field, values);
            }
            tplRet = applyLimit(tplRet, sqlConf.getDsType(), fetchCap);
            List<Map<String, Object>> rows = RdsUtil.selectList(tplRet);
            String labelField = StrUtil.trim(request.getLabelField());
            List<VisFilterOptionItem> items = VisFilterOptionNormalizer.normalize(rows, field, labelField);
            if (StrUtil.isNotBlank(field) && items.isEmpty() && !rows.isEmpty()) {
                throw new ResultException(ResultEnum.FAIL.getCode(), "查询结果没有字段「" + field + "」");
            }
            VisFilterOptionsResponse response = new VisFilterOptionsResponse();
            if (byValue) {
                response.setList(VisFilterOptionNormalizer.pickByValues(items, values));
                response.setTruncated(false);
                return response;
            }
            items = VisFilterOptionNormalizer.applyKeyword(items, keyword);
            boolean truncated = items.size() > limit;
            response.setList(VisFilterOptionNormalizer.limit(items, limit));
            response.setTruncated(truncated);
            return response;
        } catch (Exception e) {
            log.warn("filter-options failed datasetId={}", request.getDatasetId(), e);
            throw unwrapFail(e, ctx);
        } finally {
            QueryContextHolder.remove();
        }
    }

    static int resolveLimit(Integer limit) {
        if (limit == null || limit <= 0) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> exampleParams(String raw) {
        if (StrUtil.isBlank(raw)) {
            return new HashMap<>();
        }
        try {
            Map<String, Object> map = JsonUtil.toBean(raw.trim(), Map.class);
            return map == null ? new HashMap<>() : new HashMap<>(map);
        } catch (Exception ignored) {
            return new HashMap<>();
        }
    }

    static SqlTplRet applyValueFilter(SqlTplRet tplRet, String dsType, String field, List<String> values) {
        String inner = stripSemicolon(tplRet.getSql());
        SqlDialect dialect = SqlDialect.of(dsType);
        String col = stringExpr(dsType, dialect.qualify("__fo", field));
        String marks = String.join(", ", Collections.nCopies(values.size(), "?"));
        String sql = "SELECT * FROM (" + inner + ") __fo WHERE " + col + " IN (" + marks + ")";
        List<Object> params = new ArrayList<>();
        if (tplRet.getParams() != null) {
            Collections.addAll(params, tplRet.getParams());
        }
        params.addAll(values);
        return new SqlTplRet(tplRet.getSqlId(), tplRet.getDsName(), sql, params.toArray());
    }

    static String stringExpr(String dsType, String expr) {
        return SqlDialect.of(dsType).stringExpr(expr);
    }

    static SqlTplRet applyLimit(SqlTplRet tplRet, String dsType, int limit) {
        String inner = stripSemicolon(tplRet.getSql());
        String wrapped = "SELECT * FROM (" + inner + ") __fo";
        List<Object> params = new ArrayList<>();
        if (tplRet.getParams() != null) {
            Collections.addAll(params, tplRet.getParams());
        }
        SqlPageUtil.PageSql pageSql = SqlPageUtil.getPageSql(dsType, wrapped, 0, limit);
        params.addAll(pageSql.getPage());
        return new SqlTplRet(tplRet.getSqlId(), tplRet.getDsName(), pageSql.getSql(), params.toArray());
    }

    static String stripSemicolon(String sql) {
        String text = StrUtil.trim(sql);
        if (StrUtil.endWith(text, ";")) {
            return StrUtil.trim(text.substring(0, text.length() - 1));
        }
        return text;
    }

    private static ResultException unwrapFail(Exception e, QueryContext ctx) {
        if (e instanceof ResultException) {
            return VisExecSql.wrap(e, ctx);
        }
        String detail = StrUtil.blankToDefault(StrUtil.trim(e.getMessage()), VisExecSql.QUERY_FAIL);
        return new ResultException(ResultEnum.FAIL.getCode(), detail);
    }
}
