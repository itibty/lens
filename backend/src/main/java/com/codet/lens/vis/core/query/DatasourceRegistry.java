package com.codet.lens.vis.core.query;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DatasourceRegistry {
    private final VisDatasourceMapper datasourceMapper;
    private final DatasourceConnectionFactory connections;
    private final Map<String, HikariDataSource> pools = new ConcurrentHashMap<>();
    private final Map<String, Object> sourceLocks = new ConcurrentHashMap<>();
    private volatile boolean closed;

    public JdbcTemplate template(String sourceName) {
        return new JdbcTemplate(pool(sourceName));
    }

    public boolean exists(String sourceName) {
        return !closed && (pools.containsKey(sourceName) || loadEnabled(sourceName) != null);
    }

    public DataSource raw(String sourceName) {
        return pool(sourceName);
    }

    /** 与该数据源的懒加载互斥，其他数据源无需等待网络连接。 */
    public void evict(String sourceName) {
        if (sourceName == null)
            return;
        synchronized (lock(sourceName)) {
            HikariDataSource previous = pools.remove(sourceName);
            if (previous != null)
                previous.close();
        }
    }

    private HikariDataSource pool(String sourceName) {
        synchronized (lock(sourceName)) {
            if (closed)
                throw ResultException.fail("数据源服务已关闭");
            HikariDataSource existing = pools.get(sourceName);
            if (existing != null)
                return existing;
            VisDatasource row = loadEnabled(sourceName);
            if (row == null)
                throw ResultException.fail("数据源不存在或已禁用");
            HikariDataSource created = connections.open(row);
            if (closed) {
                created.close();
                throw ResultException.fail("数据源服务已关闭");
            }
            pools.put(sourceName, created);
            return created;
        }
    }

    private Object lock(String sourceName) {
        return sourceLocks.computeIfAbsent(sourceName, ignored -> new Object());
    }

    private VisDatasource loadEnabled(String sourceName) {
        return datasourceMapper.selectOne(Wrappers.<VisDatasource>lambdaQuery()
                .eq(VisDatasource::getSourceName, sourceName).eq(VisDatasource::getStatus, Status.EBL));
    }

    @PreDestroy
    public void closeAll() {
        closed = true;
        sourceLocks.keySet().forEach(this::evict);
    }
}
