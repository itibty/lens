package com.codet.lens.vis.service;

import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.core.query.DatasourceRegistry;
import com.codet.lens.vis.core.query.RdsUtil;
import com.codet.lens.vis.core.query.SqlConf;
import com.codet.lens.vis.core.query.SqlTplPara;
import com.codet.lens.vis.dto.dataset.DataTimeConfig;
import com.codet.lens.vis.dto.query.QueryMeta;
import com.codet.lens.vis.entity.VisDataset;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.*;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import net.sf.jsqlparser.parser.CCJSqlParserUtil;
import net.sf.jsqlparser.statement.select.Select;
import org.springframework.stereotype.Service;

/** 时间查询与业务查询独立；时间元数据失败不能抹掉业务结果。 */
@Service
@RequiredArgsConstructor
public class DatasetDataTimeService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final VisDatasetMapper datasets;
    private final VisDatasourceMapper sources;
    private final DatasourceRegistry registry;
    private final Map<String, CompletableFuture<QueryMeta.DataTime>> pending = new ConcurrentHashMap<>();

    public QueryMeta metadata(SqlConf dataset) {
        QueryMeta meta = new QueryMeta();
        meta.setResultGeneratedAt(Instant.now().toString());
        meta.setDatasetId(dataset.getSqlId());
        meta.setDatasetName(dataset.getSqlName());
        meta.setDataTime(read(dataset));
        return meta;
    }

    private QueryMeta.DataTime read(SqlConf dataset) {
        if (dataset.getDataTimeConfigJson() == null || dataset.getDataTimeConfigJson().isBlank())
            return status("disabled", null);
        String key = dataset.getSqlId() + ":" + AuthContext.getUserIdLong() + ":"
                + dataset.getDsName() + ":" + dataset.getDataTimeConfigJson();
        CompletableFuture<QueryMeta.DataTime> future = new CompletableFuture<>();
        CompletableFuture<QueryMeta.DataTime> existing = pending.putIfAbsent(key, future);
        if (existing != null) return existing.join();
        try {
            QueryMeta.DataTime result;
            try {
                result = execute(dataset.getDsName(), JSON.readValue(dataset.getDataTimeConfigJson(), DataTimeConfig.class));
            } catch (Exception e) {
                result = status("error", "数据更新时间获取失败，请联系报表维护人员");
            }
            future.complete(result);
            return result;
        } finally {
            pending.remove(key, future);
        }
    }

    public DataTimeConfig config(Long datasetId) {
        String json = requireDataset(datasetId).getDataTimeConfigJson();
        if (json == null || json.isBlank()) return new DataTimeConfig();
        try { return JSON.readValue(json, DataTimeConfig.class); }
        catch (Exception e) { throw ResultException.fail("时间配置已损坏，请重新保存"); }
    }

    public void save(Long datasetId, DataTimeConfig config) {
        VisDataset dataset = requireDataset(datasetId);
        validate(config);
        try {
            dataset.setDataTimeConfigJson(JSON.writeValueAsString(config));
            dataset.modifyCallback();
            datasets.updateById(dataset);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw ResultException.fail("时间配置无法保存");
        }
    }

    public QueryMeta.DataTime test(Long datasetId, DataTimeConfig config) {
        VisDataset dataset = requireDataset(datasetId);
        validate(config);
        var source = sources.selectById(dataset.getSourceId());
        if (source == null || !Status.EBL.equals(source.getStatus())) throw ResultException.fail("数据源不可用");
        try { return execute(source.getSourceName(), config); }
        catch (Exception e) { throw ResultException.fail("时间查询失败：" + e.getMessage()); }
    }

    static void validate(DataTimeConfig config) {
        if (config == null) throw ResultException.fail("时间配置不能为空");
        if (config.getKind() == null || config.getPrecision() == null
                || !java.util.Set.of("updatedAt", "coverageEnd").contains(config.getKind())
                || !java.util.Set.of("date", "datetime").contains(config.getPrecision()))
            throw ResultException.fail("时间口径或精度无效");
        try { ZoneId.of(config.getTimezone()); }
        catch (Exception e) { throw ResultException.fail("时区无效"); }
        if (config.isEnabled() && (config.getSql() == null || config.getSql().isBlank()))
            throw ResultException.fail("请填写时间查询 SQL");
        if (config.getSql() != null && config.getSql().length() > 10000)
            throw ResultException.fail("时间查询 SQL 过长");
        if (config.isEnabled()) {
            var tpl = RdsUtil.getSqlTplRet(new SqlTplPara(null, "", config.getSql(), Map.of()));
            validateSelect(tpl.getSql());
        }
    }

    static void validateSelect(String sql) {
        try {
            var statements = CCJSqlParserUtil.parseStatements(sql);
            if (statements.size() != 1 || !(statements.get(0) instanceof Select)) throw new IllegalArgumentException();
            // 禁止写入型 CTE、SELECT INTO 和锁定读取；连接还会使用只读事务。
            String tokens = sql.replaceAll("'([^']|'')*'", "''").replaceAll("(?s)/\\*.*?\\*/|--[^\\r\\n]*", " ");
            if (tokens.matches("(?is).*\\b(insert|update|delete|merge|into|outfile|dumpfile|lock)\\b.*"))
                throw new IllegalArgumentException();
        } catch (Exception e) { throw ResultException.fail("时间 SQL 只支持单条只读 SELECT"); }
    }

    private QueryMeta.DataTime execute(String sourceName, DataTimeConfig config) throws Exception {
        if (!config.isEnabled()) return status("disabled", null);
        validate(config);
        var tpl = RdsUtil.getSqlTplRet(new SqlTplPara(null, sourceName, config.getSql(), Map.of()));
        QueryMeta.DataTime result = status("unknown", null);
        result.setKind(config.getKind());
        result.setPrecision(config.getPrecision());
        result.setTimezone(config.getTimezone());
        try (Connection connection = registry.raw(sourceName).getConnection()) {
            connection.setReadOnly(true);
            connection.setAutoCommit(false);
            try (var statement = connection.prepareStatement(tpl.getSql())) {
                statement.setQueryTimeout(3);
                statement.setMaxRows(2);
                Object[] params = tpl.getParams();
                for (int i = 0; params != null && i < params.length; i++) statement.setObject(i + 1, params[i]);
                try (ResultSet rows = statement.executeQuery()) {
                    if (rows.getMetaData().getColumnCount() != 1) throw ResultException.fail("必须返回一列时间");
                    if (rows.next()) {
                        Object value = rows.getObject(1);
                        if (value != null) {
                            result.setValue(format(value, config));
                            result.setStatus("ok");
                        }
                        if (rows.next()) throw ResultException.fail("必须只返回一行时间");
                    }
                }
            } finally { connection.rollback(); }
        }
        result.setCheckedAt(Instant.now().toString());
        return result;
    }

    static String format(Object value, DataTimeConfig config) {
        ZoneId zone = ZoneId.of(config.getTimezone());
        if (value instanceof java.sql.Date date) value = date.toLocalDate();
        if (value instanceof Timestamp timestamp) value = timestamp.toLocalDateTime();
        if (value instanceof String text) {
            text = text.trim().replace(' ', 'T');
            try { value = OffsetDateTime.parse(text); }
            catch (Exception ignored) {
                try { value = LocalDateTime.parse(text); }
                catch (Exception ignored2) { value = LocalDate.parse(text); }
            }
        }
        ZonedDateTime time;
        if (value instanceof LocalDate date) time = date.atStartOfDay(zone);
        else if (value instanceof LocalDateTime date) time = date.atZone(zone);
        else if (value instanceof OffsetDateTime date) time = date.atZoneSameInstant(zone);
        else if (value instanceof Instant date) time = date.atZone(zone);
        else throw ResultException.fail("查询结果不是有效日期或日期时间");
        return "date".equals(config.getPrecision()) ? time.toLocalDate().toString() : time.toOffsetDateTime().toString();
    }

    private VisDataset requireDataset(Long id) {
        VisDataset row = datasets.selectById(id);
        if (row == null || Status.DEL.equals(row.getStatus())) throw ResultException.fail("数据集不存在");
        return row;
    }

    private static QueryMeta.DataTime status(String status, String message) {
        QueryMeta.DataTime time = new QueryMeta.DataTime();
        time.setStatus(status);
        time.setMessage(message);
        time.setCheckedAt(Instant.now().toString());
        return time;
    }
}
