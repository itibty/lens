package com.codet.lens.vis.core.query;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.entity.VisDatasource;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Locale;
import org.springframework.stereotype.Component;

/** 统一正式连接与临时测试的驱动、地址校验和超时。 */
@Component
public class DatasourceConnectionFactory {
    public static final int QUERY_TIMEOUT_SECONDS = 30;

    public static void validateUrl(String dbType, String jdbcUrl) {
        parseUrl(DatasourceType.of(dbType), jdbcUrl);
    }

    private static URI parseUrl(DatasourceType type, String jdbcUrl) {
        if (jdbcUrl == null || !jdbcUrl.startsWith(type.urlPrefix()))
            throw ResultException.fail("JDBC 地址与数据库类型不匹配");
        try {
            URI uri = URI.create(jdbcUrl.substring(5));
            if (uri.getHost() == null || uri.getUserInfo() != null || uri.getFragment() != null
                    || uri.getPath() == null || uri.getPath().length() <= 1
                    || uri.getPort() == 0 || uri.getPort() > 65535 || uri.getPath().substring(1).contains("/"))
                throw new IllegalArgumentException();
            if (type == DatasourceType.STARROCKS)
                starRocksScope(uri);
            validateOptions(type, uri.getRawQuery());
            return uri;
        } catch (IllegalArgumentException e) {
            throw ResultException.fail("请输入包含主机和数据库名的有效 JDBC 地址");
        }
    }

    private static void validateOptions(DatasourceType type, String query) {
        if (query == null)
            return;
        for (String parameter : query.split("&")) {
            String key = URLDecoder.decode(parameter.split("=", 2)[0], StandardCharsets.UTF_8)
                    .toLowerCase(Locale.ROOT);
            if (!type.allowedOptions().contains(key))
                throw ResultException.fail("JDBC 地址含不支持的连接参数，请使用独立账号密码字段及常规连接参数");
        }
    }

    HikariConfig configuration(VisDatasource row) {
        DatasourceType type = DatasourceType.of(row.getDbType());
        URI uri = parseUrl(type, row.getJdbcUrl());
        HikariConfig config = new HikariConfig();
        config.setPoolName("lens-source-" + (row.getId() == null ? "test" : row.getId()));
        // 将超时加入 URL，避免驱动属性与 URL 参数优先级产生差异。
        String separator = row.getJdbcUrl().contains("?") ? "&" : "?";
        config.setJdbcUrl(row.getJdbcUrl() + separator + type.timeoutOptions());
        config.setDriverClassName(type.driver());
        config.setUsername(row.getUsername());
        config.setPassword(row.getPassword());
        config.setMaximumPoolSize(8);
        config.setMinimumIdle(0);
        config.setReadOnly(true);
        config.setConnectionTimeout(7000);
        config.setValidationTimeout(2000);
        config.setInitializationFailTimeout(-1);
        if (type == DatasourceType.STARROCKS) {
            StarRocksScope scope = starRocksScope(uri);
            // 驱动 1.1.1 未从 URL 拆分 catalog.database，显式初始化供元数据及池复用使用。
            config.setCatalog(scope.catalog());
            config.setSchema(scope.database());
            config.setConnectionInitSql("SET query_timeout = " + QUERY_TIMEOUT_SECONDS);
        }
        return config;
    }

    private static StarRocksScope starRocksScope(URI uri) {
        String[] parts = uri.getPath().substring(1).split("\\.", -1);
        if (parts.length > 2 || Arrays.stream(parts).anyMatch(String::isBlank))
            throw new IllegalArgumentException();
        return parts.length == 1 ? new StarRocksScope("default_catalog", parts[0]) : new StarRocksScope(parts[0], parts[1]);
    }

    private record StarRocksScope(String catalog, String database) {}

    public HikariDataSource open(VisDatasource row) {
        HikariDataSource pool = new HikariDataSource(configuration(row));
        try (var connection = pool.getConnection()) {
            if (!connection.isValid(2))
                throw new SQLException("Connection validation failed");
            return pool;
        } catch (Exception e) {
            pool.close();
            throw ResultException.fail(failureMessage(e));
        }
    }

    public void test(VisDatasource row) {
        try (HikariDataSource ignored = open(row)) {
            // 临时池立即关闭；不触碰注册表中的正式连接。
        }
    }

    static String failureMessage(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql) {
                String state = sql.getSQLState();
                if (state != null && state.startsWith("28"))
                    return "认证失败，请检查用户名和密码";
                if ("3D000".equals(state) || sql.getErrorCode() == 1049)
                    return "数据库不存在，请检查数据库名";
            }
        }
        return "连接失败或超时，请检查地址、网络及数据库访问权限";
    }
}
