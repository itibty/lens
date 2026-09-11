package com.codet.lens.vis.subscription;

import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.auth.AuthUser;
import com.codet.lens.common.auth.TokenInvalidateService;
import com.codet.lens.common.base.Status;
import com.codet.lens.common.config.LensProperties;
import com.codet.lens.sys.dto.user.SaveUserRequest;
import com.codet.lens.sys.service.UserAdminService;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import com.codet.lens.vis.mapper.VisDashboardSubscriptionRunMapper;
import com.codet.lens.vis.service.VisDashboardAccess;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.AdditionalAnswers.delegatesTo;
import static org.mockito.ArgumentMatchers.any;

/** 真实 MySQL 验证；只在临时数据库中建表，绝不重置传入 URL 的数据库。 */
@SpringBootTest(properties = "lens.subscription.enabled=false")
@EnabledIfEnvironmentVariable(named = "LENS_TEST_DB_URL", matches = ".+")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class DashboardSubscriptionDatabaseTest {
    private static final String DATABASE = "lens_subscription_test_" + UUID.randomUUID().toString().replace("-", "");
    private static final String URL = System.getenv("LENS_TEST_DB_URL");
    private static final String USER = System.getenv().getOrDefault("LENS_TEST_DB_USERNAME", "root");
    private static final String PASSWORD = System.getenv().getOrDefault("LENS_TEST_DB_PASSWORD", "Aa123456");
    private static boolean databaseCreated;

    @Autowired private JdbcTemplate jdbc;
    @Autowired private DashboardSubscriptionService subscriptions;
    @Autowired private VisDashboardSubscriptionRunMapper runMapper;
    @Autowired private UserAdminService users;
    @MockitoBean private TokenInvalidateService invalidations;
    @MockitoBean private VisDashboardAccess access;

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) throws Exception {
        try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD)) {
            connection.createStatement().execute("CREATE DATABASE " + DATABASE);
            databaseCreated = true;
        }
        int queryIndex = URL.indexOf('?');
        String prefix = queryIndex < 0 ? URL : URL.substring(0, queryIndex);
        String query = queryIndex < 0 ? "" : URL.substring(queryIndex);
        String testUrl = prefix.substring(0, prefix.lastIndexOf('/') + 1) + DATABASE + query;
        try (Connection connection = DriverManager.getConnection(testUrl, USER, PASSWORD)) {
            ScriptUtils.executeSqlScript(connection, new FileSystemResource("db/schema.sql"));
        }
        registry.add("spring.datasource.url", () -> testUrl);
        registry.add("spring.datasource.username", () -> USER);
        registry.add("spring.datasource.password", () -> PASSWORD);
    }

    @AfterAll
    static void dropTemporaryDatabase() throws Exception {
        if (databaseCreated) {
            try (Connection connection = DriverManager.getConnection(URL, USER, PASSWORD)) {
                connection.createStatement().execute("DROP DATABASE " + DATABASE);
            }
        }
    }

    @BeforeEach
    void seed() {
        jdbc.update("DELETE FROM vis_dashboard_subscription_run");
        jdbc.update("DELETE FROM vis_dashboard_subscription");
        jdbc.update("DELETE FROM sys_user WHERE id = 900");
        jdbc.update("INSERT INTO sys_user(id,username,password,real_name,email,status) VALUES(900,'review-user','unused','测试','old@example.com','EBL')");
        AuthContext.set(new AuthUser().setSubject("900"));
    }

    @AfterEach
    void clearAuth() {
        AuthContext.clear();
    }

    @Test
    void clearingEmailPersistsNullButOmittingEmailKeepsIt() {
        SaveUserRequest request = new SaveUserRequest();
        request.setId(900L);
        request.setUsername("review-user");
        request.setRealName("测试");
        users.save(request);
        assertEquals("old@example.com", jdbc.queryForObject("SELECT email FROM sys_user WHERE id=900", String.class));
        request.setEmail("");
        users.save(request);
        assertNull(jdbc.queryForObject("SELECT email FROM sys_user WHERE id=900", String.class));
        verify(invalidations).invalidate(900L);
    }

    @Test
    void queuedRunInsertionFailureRollsBackScheduleAdvance() {
        long due = seedDue();
        jdbc.update("INSERT INTO vis_dashboard_subscription_run(id,subscription_id,scheduled_at,trigger_type,run_status) VALUES(901,900,?,'SCHEDULED','QUEUED')", due);
        assertThrows(DuplicateKeyException.class, () -> subscriptions.claimDue(System.currentTimeMillis()));
        assertEquals(due, jdbc.queryForObject("SELECT next_fire_at FROM vis_dashboard_subscription WHERE id=900", Long.class));
        assertNull(jdbc.queryForObject("SELECT last_fire_at FROM vis_dashboard_subscription WHERE id=900", Long.class));
        jdbc.update("DELETE FROM vis_dashboard_subscription_run");
        assertEquals(1, subscriptions.claimDue(System.currentTimeMillis()));
        assertEquals(0, subscriptions.claimDue(System.currentTimeMillis()));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM vis_dashboard_subscription_run WHERE run_status='QUEUED'", Integer.class));
    }

    @Test
    void newWorkerResumesCommittedQueueAndDoesNotSendItTwice() {
        seedDue();
        subscriptions.claimDue(System.currentTimeMillis());
        DashboardSubscriptionSender sender = mock(DashboardSubscriptionSender.class);
        when(sender.channelType()).thenReturn("EMAIL");
        jobs(sender).dispatchQueued();
        jobs(sender).dispatchQueued();
        verify(sender, times(1)).send(any());
        assertEquals("SUCCESS", jdbc.queryForObject("SELECT run_status FROM vis_dashboard_subscription_run", String.class));
    }

    @Test
    void twoWorkersReadingSameQueuedRunOnlySendOnce() throws Exception {
        seedDue();
        subscriptions.claimDue(System.currentTimeMillis());
        var sender = mock(DashboardSubscriptionSender.class);
        when(sender.channelType()).thenReturn("EMAIL");
        var barrier = new CyclicBarrier(2);
        var reads = new AtomicInteger();
        var racingMapper = mock(VisDashboardSubscriptionRunMapper.class, delegatesTo(runMapper));
        doAnswer(call -> {
            List<com.codet.lens.vis.entity.VisDashboardSubscriptionRun> snapshot = runMapper.selectList(
                    (Wrapper<com.codet.lens.vis.entity.VisDashboardSubscriptionRun>) call.getArgument(0));
            if (reads.incrementAndGet() <= 2) {
                barrier.await(5, TimeUnit.SECONDS);
            }
            return snapshot;
        }).when(racingMapper).selectList(any(Wrapper.class));
        var first = jobs(sender, racingMapper);
        var second = jobs(sender, racingMapper);
        CompletableFuture.allOf(CompletableFuture.runAsync(first::dispatchQueued),
                CompletableFuture.runAsync(second::dispatchQueued)).get(10, TimeUnit.SECONDS);
        verify(sender, times(1)).send(any());
        assertEquals("SUCCESS", jdbc.queryForObject("SELECT run_status FROM vis_dashboard_subscription_run", String.class));
    }

    @Test
    void recoveryKeepsOldQueuedAndHealthyRunningTasksAndFailsLostHeartbeat() {
        long now = System.currentTimeMillis();
        long old = now - 600_000;
        jdbc.update("INSERT INTO vis_dashboard_subscription_run(id,subscription_id,scheduled_at,trigger_type,run_status,create_at) VALUES(901,900,1,'MANUAL','QUEUED',?)", old);
        jdbc.update("INSERT INTO vis_dashboard_subscription_run(id,subscription_id,scheduled_at,trigger_type,run_status,create_at,started_at,heartbeat_at) VALUES(902,900,2,'MANUAL','RUNNING',?,?,?)", old, old, now);
        jdbc.update("INSERT INTO vis_dashboard_subscription_run(id,subscription_id,scheduled_at,trigger_type,run_status,create_at,started_at,heartbeat_at) VALUES(903,900,3,'MANUAL','RUNNING',?,?,?)", old, old, old);
        jobs(mock(DashboardSubscriptionSender.class)).recoverStaleRuns(now);
        assertEquals(List.of("QUEUED", "RUNNING", "FAILED"), jdbc.queryForList("SELECT run_status FROM vis_dashboard_subscription_run ORDER BY id", String.class));
    }

    private long seedDue() {
        long due = System.currentTimeMillis() - 60_000;
        jdbc.update("""
                INSERT INTO vis_dashboard_subscription(id,dashboard_id,owner_id,subscription_name,schedule_type,
                  schedule_json,timezone,channel_type,target_json,next_fire_at,status)
                VALUES(900,900,900,'测试','DAILY','{"time":"09:00"}','Asia/Shanghai','EMAIL','{}',?,'EBL')
                """, due);
        return due;
    }

    private DashboardSubscriptionJobService jobs(DashboardSubscriptionSender sender) {
        return jobs(sender, runMapper);
    }

    private DashboardSubscriptionJobService jobs(DashboardSubscriptionSender sender,
                                                VisDashboardSubscriptionRunMapper mapper) {
        var dashboardMapper = mock(VisDashboardMapper.class);
        when(dashboardMapper.selectById(900L)).thenReturn(new VisDashboard().setStatus(Status.EBL).setDashName("测试"));
        var owners = mock(DashboardSubscriptionOwnerService.class);
        when(owners.prepare(900L, 900L)).thenReturn(new DashboardSubscriptionOwnerService.OwnerSession("test@example.com", "test"));
        var screenshots = mock(DashboardScreenshotService.class);
        when(screenshots.capture(900L, "test")).thenReturn(new byte[]{1});
        var props = new LensProperties();
        props.getSubscription().setEnabled(true);
        return new DashboardSubscriptionJobService(mapper, dashboardMapper, subscriptions, owners,
                screenshots, List.of(sender), Runnable::run, props);
    }
}
