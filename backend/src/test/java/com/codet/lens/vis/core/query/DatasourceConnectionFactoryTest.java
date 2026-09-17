package com.codet.lens.vis.core.query;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.entity.VisDatasource;
import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class DatasourceConnectionFactoryTest {
    @Test void starRocksInitializesCatalogAndDatabaseSeparately() {
        var row = new VisDatasource().setDbType("STARROCKS")
                .setJdbcUrl("jdbc:starrocks://localhost:9030/hive.default?useSSL=false")
                .setUsername("report").setPassword("");
        var config = new DatasourceConnectionFactory().configuration(row);
        assertEquals("com.starrocks.cj.jdbc.Driver", config.getDriverClassName());
        assertEquals("hive", config.getCatalog());
        assertEquals("default", config.getSchema());
        assertEquals("SET query_timeout = 30", config.getConnectionInitSql());
        row.setJdbcUrl("jdbc:starrocks://localhost:9030/analytics");
        config = new DatasourceConnectionFactory().configuration(row);
        assertEquals("default_catalog", config.getCatalog());
        assertEquals("analytics", config.getSchema());
    }

    @Test void starRocksRejectsAmbiguousScopeAndUnsafeParameters() {
        for (String suffix : new String[]{"hive.", ".default", "a.b.c", "hive/db", "hive.default?sessionVariables=query_timeout=0",
                "hive.default?allowMultiQueries=true", "hive.default?socketTimeout=0"}) {
            assertThrows(ResultException.class, () -> DatasourceConnectionFactory.validateUrl(
                    "STARROCKS", "jdbc:starrocks://localhost:9030/" + suffix));
        }
    }
    @Test void postgresUsesDriverAndSecondBasedTimeouts() {
        var row = new VisDatasource().setDbType("POSTGRES").setJdbcUrl("jdbc:postgresql://localhost:5432/analytics?currentSchema=public")
                .setUsername("report").setPassword("secret");
        var config = new DatasourceConnectionFactory().configuration(row);
        assertEquals("org.postgresql.Driver", config.getDriverClassName());
        assertTrue(config.getJdbcUrl().endsWith("&connectTimeout=5&socketTimeout=60"));
        assertTrue(config.isReadOnly()); assertEquals(7000, config.getConnectionTimeout());
    }
    @Test void mysqlPreservesOptionsAndUsesMillisecondTimeouts() {
        var row = new VisDatasource().setDbType("MYSQL")
                .setJdbcUrl("jdbc:mysql://127.0.0.1:3306/lens?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai")
                .setUsername("report").setPassword("");
        var config = new DatasourceConnectionFactory().configuration(row);
        assertEquals("com.mysql.cj.jdbc.Driver", config.getDriverClassName());
        assertTrue(config.getJdbcUrl().endsWith("&connectTimeout=5000&socketTimeout=60000")); assertEquals("", config.getPassword());
    }
    @Test void rejectsWrongDriverMalformedUrlsAndEmbeddedCredentials() {
        for (String url : new String[]{"jdbc:postgresql://localhost/db", "jdbc:mysql://localhost/", "jdbc:mysql://user:pass@localhost/db",
                "jdbc:mysql://localhost/db?password=secret", "jdbc:mysql://localhost/db?socketFactory=custom.Factory", "jdbc:mysql://localhost:99999/db"})
            assertThrows(ResultException.class, () -> DatasourceConnectionFactory.validateUrl("MYSQL", url), url);
    }
    @Test void errorsDoNotLeakDriverMessages() {
        assertEquals("认证失败，请检查用户名和密码", DatasourceConnectionFactory.failureMessage(new SQLException("password secret", "28000")));
        assertEquals("数据库不存在，请检查数据库名", DatasourceConnectionFactory.failureMessage(new SQLException("private database", "3D000")));
        assertFalse(DatasourceConnectionFactory.failureMessage(new RuntimeException("secret host password")).contains("secret"));
    }
}
