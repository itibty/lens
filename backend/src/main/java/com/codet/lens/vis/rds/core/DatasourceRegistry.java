package com.codet.lens.vis.rds.core;

import com.codet.lens.common.FieldConst;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatasourceRegistry {

    private final VisDatasourceMapper datasourceMapper;
    private final Map<String, HikariDataSource> pools = new ConcurrentHashMap<>();

    public JdbcTemplate template(String sourceName) {
        HikariDataSource ds = pools.computeIfAbsent(sourceName, this::create);
        return new JdbcTemplate(ds);
    }

    public boolean exists(String sourceName) {
        return pools.containsKey(sourceName) || loadEnabled(sourceName) != null;
    }

    public void evict(String sourceName) {
        HikariDataSource ds = pools.remove(sourceName);
        if (ds != null) {
            ds.close();
        }
    }

    public void refresh(VisDatasource row) {
        evict(row.getSourceName());
        if (FieldConst.EBL.equals(row.getStatus())) {
            pools.put(row.getSourceName(), create(row));
        }
    }

    private HikariDataSource create(String sourceName) {
        VisDatasource row = loadEnabled(sourceName);
        if (row == null) {
            throw new IllegalStateException(sourceName + "数据源未连接");
        }
        return create(row);
    }

    private HikariDataSource create(VisDatasource row) {
        HikariConfig conf = new HikariConfig();
        conf.setPoolName("lens-" + row.getSourceName());
        conf.setJdbcUrl(row.getJdbcUrl());
        conf.setUsername(row.getUsername());
        conf.setPassword(row.getPassword());
        conf.setMaximumPoolSize(8);
        conf.setMinimumIdle(0);
        conf.setReadOnly(true);
        log.info("打开数据源 {}", row.getSourceName());
        return new HikariDataSource(conf);
    }

    private VisDatasource loadEnabled(String sourceName) {
        return datasourceMapper.selectList(null).stream()
                .filter(r -> sourceName.equals(r.getSourceName()) && FieldConst.EBL.equals(r.getStatus()))
                .findFirst()
                .orElse(null);
    }

    public DataSource raw(String sourceName) {
        return pools.computeIfAbsent(sourceName, this::create);
    }
}
