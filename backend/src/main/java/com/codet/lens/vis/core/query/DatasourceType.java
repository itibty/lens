package com.codet.lens.vis.core.query;

import com.codet.lens.common.base.ResultException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/** 数据库产品的连接配置；SQL 生成由对应方言处理。 */
public enum DatasourceType {
    MYSQL("jdbc:mysql://", "com.mysql.cj.jdbc.Driver", SqlDialect.MYSQL),
    POSTGRES("jdbc:postgresql://", "org.postgresql.Driver", SqlDialect.POSTGRES),
    STARROCKS("jdbc:starrocks://", "com.starrocks.cj.jdbc.Driver", SqlDialect.STARROCKS);

    private static final Set<String> MYSQL_OPTIONS = Set.of("useunicode", "characterencoding", "servertimezone",
            "connectiontimezone", "usessl", "requiressl", "verifyservercertificate", "allowpublickeyretrieval",
            "zerodatetimebehavior", "tinyint1isbit", "sslmode");
    private static final Set<String> POSTGRES_OPTIONS = Set.of("ssl", "sslmode", "currentschema", "applicationname",
            "stringtype", "preferquerymode");

    private final String urlPrefix;
    private final String driver;
    private final SqlDialect dialect;

    DatasourceType(String urlPrefix, String driver, SqlDialect dialect) {
        this.urlPrefix = urlPrefix;
        this.driver = driver;
        this.dialect = dialect;
    }

    public static DatasourceType of(String value) {
        String type = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if ("POSTGRESQL".equals(type))
            type = "POSTGRES";
        for (DatasourceType candidate : values()) {
            if (candidate.name().equals(type))
                return candidate;
        }
        throw ResultException.fail("暂不支持的数据源类型：" + (type.isEmpty() ? "空" : type) + "，当前仅支持 "
                + Arrays.stream(values()).map(Enum::name).collect(Collectors.joining("、")));
    }

    public String urlPrefix() {
        return urlPrefix;
    }

    public String driver() {
        return driver;
    }

    public SqlDialect dialect() {
        return dialect;
    }

    public Set<String> allowedOptions() {
        return this == POSTGRES ? POSTGRES_OPTIONS : MYSQL_OPTIONS;
    }

    public String timeoutOptions() {
        return this == POSTGRES ? "connectTimeout=5&socketTimeout=60" : "connectTimeout=5000&socketTimeout=60000";
    }

    // 原生驱动 1.1.1 的主键/索引查询无法正确定位外部 catalog；报表只依赖表和字段。
    public boolean supportsKeyMetadata() {
        return this != STARROCKS;
    }
}
