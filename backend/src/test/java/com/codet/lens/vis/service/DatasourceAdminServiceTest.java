package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.core.query.DatasourceConnectionFactory;
import com.codet.lens.vis.core.query.DatasourceRegistry;
import com.codet.lens.vis.dto.datasource.*;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import org.junit.jupiter.api.*;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DatasourceAdminServiceTest {
    final VisDatasourceMapper sources = mock(VisDatasourceMapper.class);
    final VisDatasetMapper datasets = mock(VisDatasetMapper.class);
    final DatasourceRegistry registry = mock(DatasourceRegistry.class);
    final DatasourceConnectionFactory connections = mock(DatasourceConnectionFactory.class);
    final DatasourceAdminService service = new DatasourceAdminService(mock(ResourceAuditService.class), sources, datasets, registry, connections);
    VisDatasource old;
    @BeforeEach void setup() {
        TransactionSynchronizationManager.initSynchronization();
        old = new VisDatasource().setSourceName("零售库").setDbType("MYSQL").setJdbcUrl("jdbc:mysql://localhost/lens")
                .setUsername("report").setPassword("secret").setStatus(Status.EBL);
        old.setId(1L);
        when(sources.selectForUpdate(1L)).thenReturn(old);
        when(sources.selectById(1L)).thenReturn(old);
        when(sources.updateById(any(VisDatasource.class))).thenReturn(1);
    }
    @AfterEach void cleanup() { TransactionSynchronizationManager.clearSynchronization(); }
    SaveDatasourceRequest request() {
        var r = new SaveDatasourceRequest();
        r.setId(1L); r.setSourceName(old.getSourceName()); r.setDbType(old.getDbType());
        r.setJdbcUrl(old.getJdbcUrl()); r.setUsername(old.getUsername());
        return r;
    }
    @Test void retainsPasswordAndOnlyEvictsAfterCommit() {
        var r = request(); r.setSourceName("新名称"); service.save(r);
        verify(sources).updateById(argThat((VisDatasource row) -> "secret".equals(row.getPassword())));
        verifyNoInteractions(connections, registry);
        TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());
        verify(registry).evict("零售库"); verify(registry).evict("新名称");
    }
    @Test void explicitEmptyPasswordReplacesOldValue() {
        var r = request(); r.setPassword(""); service.save(r);
        verify(connections).test(argThat(row -> "".equals(row.getPassword())));
        verify(sources).updateById(argThat((VisDatasource row) -> "".equals(row.getPassword())));
        assertEquals("secret", old.getPassword());
    }
    @Test void failedTestDoesNotWriteOrEvict() {
        var r = request(); r.setPassword("wrong");
        doThrow(ResultException.fail("认证失败")).when(connections).test(any());
        assertThrows(ResultException.class, () -> service.save(r));
        verify(sources, never()).updateById(any(VisDatasource.class));
        verifyNoInteractions(registry);
        assertTrue(TransactionSynchronizationManager.getSynchronizations().isEmpty());
    }
    @Test void rollbackKeepsOriginalPool() {
        var r = request(); r.setJdbcUrl("jdbc:mysql://localhost/newdb"); service.save(r);
        TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCompletion(1));
        verifyNoInteractions(registry);
    }
    @Test void confirmsReferencedConnectionChange() {
        when(datasets.selectCount(any())).thenReturn(2L);
        var r = request(); r.setUsername("another");
        var error = assertThrows(ResultException.class, () -> service.save(r));
        assertEquals(2, assertInstanceOf(DatasourceImpact.class, error.getData()).datasetCount());
        verifyNoInteractions(connections, registry);
        r.setConfirmImpact(true); service.save(r);
        verify(sources).updateById(any(VisDatasource.class));
    }
    @Test void cannotDeleteReferencedSource() {
        when(datasets.selectCount(any())).thenReturn(1L);
        assertThrows(ResultException.class, () -> service.delete(1L));
        verify(sources, never()).updateById(any(VisDatasource.class));
    }
    @Test void disableConfirmsAndEnableTestsConnection() {
        when(datasets.selectCount(any())).thenReturn(1L);
        var r = new DatasourceStatusRequest(); r.setId(1L); r.setStatus(Status.DBL);
        assertThrows(ResultException.class, () -> service.status(r));
        r.setConfirmImpact(true); service.status(r);
        verifyNoInteractions(connections); assertEquals(Status.DBL, old.getStatus());
        r.setStatus(Status.EBL); service.status(r); verify(connections).test(old);
    }
    @Test void standaloneTestUsesStoredPasswordAndDoesNotSave() {
        assertTrue(service.test(request()).success());
        verify(connections).test(argThat(row -> "secret".equals(row.getPassword())));
        verify(sources, never()).updateById(any(VisDatasource.class)); verifyNoInteractions(registry);
    }
    @Test void testReturnsFailureWithoutLeakingPassword() {
        doThrow(ResultException.fail("认证失败，请检查用户名和密码")).when(connections).test(any());
        var result = service.test(request()); assertFalse(result.success()); assertFalse(result.message().contains("secret"));
    }
    @Test void detailDoesNotReturnPassword() {
        String json = new tools.jackson.databind.ObjectMapper().writeValueAsString(service.detail(1L));
        assertFalse(json.contains("secret")); assertFalse(json.contains("\"password\":"));
        assertTrue(json.contains("\"passwordSet\":true"));
    }
}
