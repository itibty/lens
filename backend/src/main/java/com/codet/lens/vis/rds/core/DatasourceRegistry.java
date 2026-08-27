package com.codet.lens.vis.rds.core;

import com.codet.lens.common.FieldConst;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Collections;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.Map;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatasourceRegistry {

    private final VisDatasourceMapper datasourceMapper;
    private final Map<String, HikariDataSource> pools = new HashMap<>();

    public synchronized JdbcTemplate template(String sourceName) {
        return new JdbcTemplate(pool(sourceName));
    }

    public synchronized boolean exists(String sourceName) {
        return pools.containsKey(sourceName) || loadEnabled(sourceName) != null;
    }

    public synchronized void evict(String sourceName) {
        close(pools.remove(sourceName));
    }

    /**
     * 新池验证成功后再替换；重命名时旧名称和新名称下的历史池都会关闭。
     * 创建失败时不修改注册表，调用方可安全回滚数据库事务。
     */
    public synchronized void refresh(String oldSourceName, VisDatasource row) {
        HikariDataSource replacement = FieldConst.EBL.equals(row.getStatus()) ? create(row) : null;
        Set<HikariDataSource> stale = Collections.newSetFromMap(new IdentityHashMap<>());
        if (oldSourceName != null) {
            stale.add(pools.remove(oldSourceName));
        }
        HikariDataSource current = replacement == null
                ? pools.remove(row.getSourceName())
                : pools.put(row.getSourceName(), replacement);
        stale.add(current);
        stale.remove(null);
        stale.remove(replacement);
        stale.forEach(DatasourceRegistry::close);
    }

    private HikariDataSource create(String sourceName) {
        VisDatasource row = loadEnabled(sourceName);
        if (row == null) {
            throw new IllegalStateException(sourceName + "数据源未连接");
        }
        return create(row);
    }

    HikariDataSource create(VisDatasource row) {
        HikariConfig conf = new HikariConfig();
        conf.setPoolName("lens-" + row.getSourceName());
        conf.setJdbcUrl(row.getJdbcUrl());
        conf.setUsername(row.getUsername());
        conf.setPassword(row.getPassword());
        conf.setMaximumPoolSize(8);
        conf.setMinimumIdle(0);
        conf.setReadOnly(true);
        HikariDataSource dataSource = null;
        try {
            dataSource = new HikariDataSource(conf);
            try (Connection connection = dataSource.getConnection()) {
                if (!connection.isValid(5))
                    throw new IllegalStateException("连接校验失败");
            }
            log.info("打开数据源 {}", row.getSourceName());
            return dataSource;
        } catch (Exception e) {
            close(dataSource);
            throw new IllegalStateException(row.getSourceName() + "数据源连接失败", e);
        }
    }

    private VisDatasource loadEnabled(String sourceName) {
        return datasourceMapper.selectList(null).stream()
                .filter(r -> sourceName.equals(r.getSourceName()) && FieldConst.EBL.equals(r.getStatus()))
                .findFirst()
                .orElse(null);
    }

    public synchronized DataSource raw(String sourceName) {
        return pool(sourceName);
    }

    @PreDestroy
    public synchronized void closeAll() {
        Set<HikariDataSource> all = Collections.newSetFromMap(new IdentityHashMap<>());
        all.addAll(pools.values());
        pools.clear();
        all.forEach(DatasourceRegistry::close);
    }

    private HikariDataSource pool(String sourceName) {
        HikariDataSource existing = pools.get(sourceName);
        if (existing != null)
            return existing;
        HikariDataSource created = create(sourceName);
        pools.put(sourceName, created);
        return created;
    }

    private static void close(HikariDataSource dataSource) {
        if (dataSource != null)
            dataSource.close();
    }
}
