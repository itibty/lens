package com.codet.lens.vis.core.query;

import cn.hutool.core.date.DateUtil;
import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.util.JsonUtil;
import com.jfinal.plugin.activerecord.SqlPara;
import jakarta.annotation.PostConstruct;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import lombok.NonNull;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class RdsUtil {
    private static final SqlTplEngine SQL_TPL_ENGINE = new SqlTplEngine("default");
    private static final int DEFAULT_MAX_ROWS = 50000;
    private static final int DEFAULT_FETCH_SIZE = 1000;
    private static DatasourceRegistry REGISTRY;

    private final DatasourceRegistry datasourceRegistry;

    public RdsUtil(DatasourceRegistry datasourceRegistry) {
        this.datasourceRegistry = datasourceRegistry;
    }

    @PostConstruct
    void bind() {
        REGISTRY = datasourceRegistry;
    }

    public static List<Map<String, Object>> selectList(SqlTplRet tplRet) {
        return select(tplRet).getRows();
    }

    public static SqlSelectResult select(SqlTplRet tplRet) {
        if (REGISTRY == null || !REGISTRY.exists(tplRet.getDsName())) {
            throw new RuntimeException(tplRet.getDsName() + "数据源未连接");
        }
        QueryContext queryCtx = QueryContextHolder.getOrDefault();
        QueryContext holderCtx = QueryContextHolder.get();
        if (holderCtx != null) {
            holderCtx.recordSql(tplRet.getSql(), tplRet.getParams());
        }
        int maxRows = queryCtx.getMaxRows() != null ? queryCtx.getMaxRows() : DEFAULT_MAX_ROWS;
        int fetchSize = safeFetchSize(queryCtx.getFetchSize(), maxRows);
        JdbcTemplate jdbc = REGISTRY.template(tplRet.getDsName());
        try {
            return jdbc.execute((ConnectionCallback<SqlSelectResult>) conn -> {
                PreparedStatement ps = conn.prepareStatement(tplRet.getSql());
                ps.setMaxRows(maxRows);
                ps.setFetchSize(fetchSize);
                Object[] params = tplRet.getParams() == null ? new Object[0] : tplRet.getParams();
                for (int i = 0; i < params.length; i++) {
                    ps.setObject(i + 1, params[i]);
                }
                ResultSet rs = ps.executeQuery();
                ResultSetMetaData meta = rs.getMetaData();
                int colCount = meta.getColumnCount();
                List<String> fields = new ArrayList<>(colCount);
                for (int i = 1; i <= colCount; i++) {
                    fields.add(columnField(meta, i));
                }
                requireUniqueColumnLabels(fields);
                List<SqlColumnMeta> columns = new ArrayList<>();
                for (int i = 1; i <= colCount; i++) {
                    columns.add(new SqlColumnMeta(fields.get(i - 1), meta.getColumnTypeName(i), meta.getColumnType(i)));
                }
                List<Map<String, Object>> rows = new ArrayList<>();
                while (rs.next() && rows.size() < maxRows) {
                    Map<String, Object> row = new LinkedHashMap<>(colCount);
                    for (int i = 1; i <= colCount; i++) {
                        row.put(fields.get(i - 1), rs.getObject(i));
                    }
                    rows.add(row);
                }
                if (rows.size() >= maxRows) {
                    queryCtx.setTruncated(true);
                }
                return new SqlSelectResult(rows, columns);
            });
        } catch (Exception e) {
            log.error("DS_EXEC_ERR:{}", JsonUtil.toJson(tplRet), e);
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    public static SqlTplRet getSqlTplRet(SqlTplPara tplPara) {
        Map<String, Object> params = new HashMap<>(tplPara.getParams() == null ? Map.of() : tplPara.getParams());
        params.put("USER_ID", Optional.ofNullable(AuthContext.getUserIdLong()).orElse(0L));
        params.put("NOW_TS", System.currentTimeMillis());
        params.put("NOW_DT", DateUtil.now());
        SqlPara sqlPara = SQL_TPL_ENGINE.getSqlPara(tplPara.getSqlTpl(), params);
        return new SqlTplRet(tplPara.getSqlId(), tplPara.getDsName(), sqlPara.getSql(), sqlPara.getPara());
    }

    public static SqlTplRet getSqlTplRet(@NonNull SqlConf sqlConf, @NonNull Map<String, Object> params) {
        return getSqlTplRet(new SqlTplPara(sqlConf.getSqlId(), sqlConf.getDsName(), sqlConf.getSqlContent(), params));
    }

    static int safeFetchSize(Integer fetchSize, int maxRows) {
        int size = fetchSize == null || fetchSize <= 0 ? DEFAULT_FETCH_SIZE : fetchSize;
        if (maxRows > 0 && size > maxRows) {
            return maxRows;
        }
        return size;
    }

    static void requireUniqueColumnLabels(List<String> fields) {
        Set<String> seen = new LinkedHashSet<>();
        Set<String> duplicates = new LinkedHashSet<>();
        for (String field : fields) {
            String normalized = field.toLowerCase(Locale.ROOT);
            if (!seen.add(normalized)) {
                duplicates.add(field);
            }
        }
        if (duplicates.isEmpty()) {
            return;
        }
        String names = duplicates.stream().limit(5).collect(Collectors.joining("、"));
        String suffix = duplicates.size() > 5 ? " 等" : "";
        throw new IllegalArgumentException("查询结果存在重复列名：" + names + suffix
                + "。Lens 要求输出列名唯一，请使用 AS 设置唯一别名，例如 a.id AS order_id、b.id AS customer_id");
    }

    private static String columnField(ResultSetMetaData meta, int index) throws java.sql.SQLException {
        String label = meta.getColumnLabel(index);
        if (label != null && !label.isEmpty()) {
            return label;
        }
        return meta.getColumnName(index);
    }
}
