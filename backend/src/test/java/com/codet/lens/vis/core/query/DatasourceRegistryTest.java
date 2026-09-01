package com.codet.lens.vis.core.query;

import com.codet.lens.common.base.Status;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.zaxxer.hikari.HikariDataSource;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DatasourceRegistryTest {

    private final VisDatasourceMapper mapper = mock(VisDatasourceMapper.class);
    private final DatasourceRegistry registry = spy(new DatasourceRegistry(mapper));

    @Test
    void renamingDatasourceReplacesPoolAndClosesOldName() {
        HikariDataSource oldPool = mock(HikariDataSource.class);
        HikariDataSource newPool = mock(HikariDataSource.class);
        VisDatasource old = datasource("old", Status.EBL);
        VisDatasource renamed = datasource("new", Status.EBL);
        when(mapper.selectList(isNull())).thenReturn(List.of());
        doReturn(oldPool).when(registry).create(old);
        doReturn(newPool).when(registry).create(renamed);
        registry.refresh(null, old);

        registry.refresh("old", renamed);

        assertFalse(registry.exists("old"));
        assertTrue(registry.exists("new"));
        assertSame(newPool, registry.raw("new"));
        verify(oldPool).close();
    }

    @Test
    void disablingDatasourceClosesExistingPool() {
        HikariDataSource oldPool = mock(HikariDataSource.class);
        VisDatasource enabled = datasource("sales", Status.EBL);
        doReturn(oldPool).when(registry).create(enabled);
        registry.refresh(null, enabled);

        registry.refresh("sales", datasource("sales", Status.DBL));

        verify(oldPool).close();
    }

    @Test
    void updatingSameNameSwapsPoolAndClosesPreviousOne() {
        HikariDataSource oldPool = mock(HikariDataSource.class);
        HikariDataSource newPool = mock(HikariDataSource.class);
        VisDatasource old = datasource("sales", Status.EBL);
        VisDatasource updated = datasource("sales", Status.EBL);
        doReturn(oldPool).when(registry).create(old);
        doReturn(newPool).when(registry).create(updated);
        registry.refresh(null, old);

        registry.refresh("sales", updated);

        assertSame(newPool, registry.raw("sales"));
        verify(oldPool).close();
    }

    @Test
    void failedReplacementKeepsOldPoolAvailable() {
        HikariDataSource oldPool = mock(HikariDataSource.class);
        VisDatasource old = datasource("old", Status.EBL);
        VisDatasource renamed = datasource("new", Status.EBL);
        doReturn(oldPool).when(registry).create(old);
        doThrow(new IllegalStateException("连接失败")).when(registry).create(renamed);
        registry.refresh(null, old);

        assertThrows(IllegalStateException.class, () -> registry.refresh("old", renamed));

        assertSame(oldPool, registry.raw("old"));
        verify(oldPool, never()).close();
    }

    @Test
    void shutdownClosesAllCachedPools() {
        HikariDataSource first = mock(HikariDataSource.class);
        HikariDataSource second = mock(HikariDataSource.class);
        VisDatasource one = datasource("one", Status.EBL);
        VisDatasource two = datasource("two", Status.EBL);
        doReturn(first).when(registry).create(one);
        doReturn(second).when(registry).create(two);
        registry.refresh(null, one);
        registry.refresh(null, two);

        registry.closeAll();

        verify(first).close();
        verify(second).close();
    }

    private static VisDatasource datasource(String sourceName, String status) {
        return new VisDatasource()
                .setSourceName(sourceName)
                .setStatus(status);
    }
}
