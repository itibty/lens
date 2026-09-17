package com.codet.lens.vis.core.query;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.zaxxer.hikari.HikariDataSource;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DatasourceRegistryTest {
    final VisDatasourceMapper mapper = mock(VisDatasourceMapper.class);
    final DatasourceConnectionFactory connections = mock(DatasourceConnectionFactory.class);
    final DatasourceRegistry registry = new DatasourceRegistry(mapper, connections);
    final VisDatasource source = new VisDatasource().setSourceName("sales");
    @Test void reusesPoolAndEvictionLoadsUpdatedConnection() {
        var first = mock(HikariDataSource.class); var second = mock(HikariDataSource.class);
        when(mapper.selectOne(any())).thenReturn(source); when(connections.open(source)).thenReturn(first, second);
        assertSame(first, registry.raw("sales")); assertSame(first, registry.raw("sales"));
        registry.evict("sales"); verify(first).close(); assertSame(second, registry.raw("sales"));
    }
    @Test void failedCreationIsNotCached() {
        when(mapper.selectOne(any())).thenReturn(source);
        when(connections.open(source)).thenThrow(ResultException.fail("连接失败"));
        assertThrows(ResultException.class, () -> registry.raw("sales"));
        assertThrows(ResultException.class, () -> registry.raw("sales")); verify(connections, times(2)).open(source);
    }
    @Test void slowSourceDoesNotBlockOtherSources() throws Exception {
        var started = new CountDownLatch(1); var release = new CountDownLatch(1);
        var slowSource = new VisDatasource().setSourceName("slow");
        var slowPool = mock(HikariDataSource.class); var fastPool = mock(HikariDataSource.class);
        when(mapper.selectOne(any())).thenReturn(slowSource, source);
        when(connections.open(slowSource)).thenAnswer(call -> {
            started.countDown(); assertTrue(release.await(5, TimeUnit.SECONDS)); return slowPool;
        });
        when(connections.open(source)).thenReturn(fastPool);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var slow = executor.submit(() -> registry.raw("slow"));
            try {
                assertTrue(started.await(2, TimeUnit.SECONDS));
                assertSame(fastPool, executor.submit(() -> registry.raw("sales")).get(2, TimeUnit.SECONDS));
            } finally { release.countDown(); }
            assertSame(slowPool, slow.get(2, TimeUnit.SECONDS));
        } finally { registry.closeAll(); }
    }
    @Test void shutdownClosesPoolsAndRejectsRequests() {
        var pool = mock(HikariDataSource.class);
        when(mapper.selectOne(any())).thenReturn(source); when(connections.open(source)).thenReturn(pool);
        registry.raw("sales"); registry.closeAll(); verify(pool).close();
        assertFalse(registry.exists("sales")); assertThrows(ResultException.class, () -> registry.raw("sales"));
    }
}
