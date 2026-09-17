package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.core.query.DatasourceConnectionFactory;
import com.codet.lens.vis.core.query.DatasourceRegistry;
import com.codet.lens.vis.dto.dataset.ConfSqlInfoRequest;
import com.codet.lens.vis.dto.datasource.SaveDatasourceRequest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** 使用临时 MySQL 库验证真实事务与引用锁，不更改应用库。 */
@SpringBootTest(properties = "lens.subscription.enabled=false")
@EnabledIfEnvironmentVariable(named = "LENS_TEST_DB_URL", matches = ".+")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class DatasourceDatabaseTest {
    static final String DATABASE = "lens_source_test_" + UUID.randomUUID().toString().replace("-", "");
    static final String URL = System.getenv("LENS_TEST_DB_URL");
    static final String USER = System.getenv().getOrDefault("LENS_TEST_DB_USERNAME", "root");
    static final String PASSWORD = System.getenv().getOrDefault("LENS_TEST_DB_PASSWORD", "Aa123456");
    static boolean created;
    @Autowired JdbcTemplate jdbc;
    @Autowired DatasourceAdminService sources;
    @Autowired DatasetAdminService datasets;
    @Autowired PlatformTransactionManager transactions;
    @MockitoBean DatasourceConnectionFactory connections;
    @MockitoBean DatasourceRegistry registry;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) throws Exception {
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD)) {
            connection.createStatement().execute("CREATE DATABASE " + DATABASE);
            created = true;
        }
        int queryStart = URL.indexOf('?');
        String prefix = queryStart < 0 ? URL : URL.substring(0, queryStart);
        String target = prefix.substring(0, prefix.lastIndexOf('/') + 1) + DATABASE + (queryStart < 0 ? "" : URL.substring(queryStart));
        try (Connection connection = DriverManager.getConnection(target, USER, PASSWORD)) {
            ScriptUtils.executeSqlScript(connection, new FileSystemResource("db/schema.sql"));
        }
        properties.add("spring.datasource.url", () -> target);
        properties.add("spring.datasource.username", () -> USER);
        properties.add("spring.datasource.password", () -> PASSWORD);
    }

    @AfterAll
    static void cleanup() throws Exception {
        if (created) {
            try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD)) {
                connection.createStatement().execute("DROP DATABASE " + DATABASE);
            }
        }
    }

    @BeforeEach
    void seed() {
        jdbc.update("DELETE FROM vis_dataset WHERE source_id=990");
        jdbc.update("DELETE FROM vis_datasource WHERE id=990");
        jdbc.update("INSERT INTO vis_datasource(id,source_name,db_type,jdbc_url,username,password,status) VALUES(990,'测试连接','MYSQL','jdbc:mysql://localhost/lens','report','old','EBL')");
    }

    @Test
    void enclosingTransactionRollbackKeepsConfigAndPool() {
        var request = new SaveDatasourceRequest();
        request.setId(990L);
        request.setSourceName("测试连接");
        request.setDbType("MYSQL");
        request.setJdbcUrl("jdbc:mysql://localhost/another");
        request.setUsername("report");
        request.setPassword("new");
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            sources.save(request);
            verifyNoInteractions(registry);
            status.setRollbackOnly();
        });
        assertEquals("old", jdbc.queryForObject("SELECT password FROM vis_datasource WHERE id=990", String.class));
        verifyNoInteractions(registry);
        sources.save(request);
        assertEquals("new", jdbc.queryForObject("SELECT password FROM vis_datasource WHERE id=990", String.class));
        verify(registry).evict("测试连接");
    }

    @Test
    void concurrentDeleteWaitsForBindingAndThenRejects() throws Exception {
        var bound = new CountDownLatch(1);
        var deleting = new CountDownLatch(1);
        var commit = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var binding = executor.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
                var request = new ConfSqlInfoRequest();
                request.setDsId(990L);
                request.setSqlName("并发绑定");
                request.setTplEngine("ENJOY");
                request.setStatus("DBL");
                datasets.saveInfo(request);
                bound.countDown();
                try { assertTrue(commit.await(5, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { throw new RuntimeException(e); }
            }));
            try {
                assertTrue(bound.await(5, TimeUnit.SECONDS));
                var deletion = executor.submit(() -> {
                    deleting.countDown();
                    return assertThrows(ResultException.class, () -> sources.delete(990L));
                });
                assertTrue(deleting.await(2, TimeUnit.SECONDS));
                commit.countDown();
                binding.get(5, TimeUnit.SECONDS);
                assertTrue(deletion.get(5, TimeUnit.SECONDS).getMsg().contains("引用"));
                assertEquals("EBL", jdbc.queryForObject("SELECT status FROM vis_datasource WHERE id=990", String.class));
            } finally { commit.countDown(); }
        }
    }
}
