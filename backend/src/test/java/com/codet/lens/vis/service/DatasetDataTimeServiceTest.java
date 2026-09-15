package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.core.query.DatasourceRegistry;
import com.codet.lens.vis.core.query.SqlConf;
import com.codet.lens.vis.dto.dataset.DataTimeConfig;
import com.codet.lens.vis.mapper.*;
import java.sql.*;
import java.time.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class DatasetDataTimeServiceTest {
    private final DatasourceRegistry registry = mock(DatasourceRegistry.class);
    private final DatasetDataTimeService service = new DatasetDataTimeService(mock(VisDatasetMapper.class), mock(VisDatasourceMapper.class), registry);

    @Test void handlesDateDatetimeAndExplicitTimezonesWithoutPretendingTheyAreRefreshTime() {
        var config = new DataTimeConfig();
        assertEquals("2026-09-14T12:30+08:00", DatasetDataTimeService.format("2026-09-14 12:30:00", config));
        assertEquals("2026-09-14T08:30+08:00", DatasetDataTimeService.format(Instant.parse("2026-09-14T00:30:00Z"), config));
        config.setPrecision("date");
        assertEquals("2026-09-14", DatasetDataTimeService.format(Date.valueOf("2026-09-14"), config));
        assertThrows(ResultException.class, () -> DatasetDataTimeService.format(12345, config));
    }

    @Test void acceptsSingleReadOnlySelectAndRejectsWritingOrMultipleStatements() {
        DatasetDataTimeService.validateSelect("SELECT max(updated_at) FROM orders");
        DatasetDataTimeService.validateSelect("WITH latest AS (SELECT max(updated_at) t FROM orders) SELECT t FROM latest");
        for (String sql : new String[]{"DELETE FROM orders", "SELECT 1; SELECT 2", "SELECT * FROM orders FOR UPDATE", "SELECT 1 INTO OUTFILE '/tmp/x'"})
            assertThrows(ResultException.class, () -> DatasetDataTimeService.validateSelect(sql), sql);
    }

    @Test void metadataErrorsAreIsolatedAndDisabledDoesNotConnect() {
        SqlConf dataset = new SqlConf();
        dataset.setSqlId(10L);
        dataset.setSqlName("销售");
        assertEquals("disabled", service.metadata(dataset).getDataTime().getStatus());
        verifyNoInteractions(registry);
        dataset.setDataTimeConfigJson("invalid");
        var meta = service.metadata(dataset);
        assertNotNull(Instant.parse(meta.getResultGeneratedAt()));
        assertEquals(10L, meta.getDatasetId());
        assertEquals("error", meta.getDataTime().getStatus());
    }

    @Test void scalarContractNullUnknownAndMultiRowFailure() throws Exception {
        var source = mock(DataSource.class);
        var connection = mock(Connection.class);
        var statement = mock(PreparedStatement.class);
        var rows = mock(ResultSet.class);
        var metadata = mock(ResultSetMetaData.class);
        when(registry.raw("orders")).thenReturn(source);
        when(source.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(rows);
        when(rows.getMetaData()).thenReturn(metadata);
        when(metadata.getColumnCount()).thenReturn(1);
        when(rows.next()).thenReturn(true, false);
        SqlConf dataset = new SqlConf();
        dataset.setDsName("orders");
        dataset.setDataTimeConfigJson("{\"enabled\":true,\"sql\":\"SELECT max(updated_at) FROM orders\"}");
        assertEquals("unknown", service.metadata(dataset).getDataTime().getStatus());
        verify(connection).setReadOnly(true);
        verify(connection).rollback();
        verify(statement).setQueryTimeout(3);
        when(rows.next()).thenReturn(true, true);
        assertEquals("error", service.metadata(dataset).getDataTime().getStatus());
    }
}
