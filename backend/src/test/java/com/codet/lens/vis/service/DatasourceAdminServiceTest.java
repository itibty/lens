package com.codet.lens.vis.service;

import com.codet.lens.common.FieldConst;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.codet.lens.vis.rds.core.DatasourceRegistry;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DatasourceAdminServiceTest {

    private final VisDatasourceMapper mapper = mock(VisDatasourceMapper.class);
    private final DatasourceRegistry registry = mock(DatasourceRegistry.class);
    private final DatasourceAdminService service = new DatasourceAdminService(mapper, registry);

    @Test
    void passesOldAndNewNamesWhenDatasourceIsRenamed() {
        VisDatasource old = datasource(1L, "old", "MYSQL");
        VisDatasource request = datasource(1L, "new", "postgresql");
        VisDatasource saved = datasource(1L, "new", "POSTGRES");
        when(mapper.selectById(1L)).thenReturn(old, saved);
        when(mapper.updateById(request)).thenReturn(1);

        Long id = service.save(request);

        assertEquals(1L, id);
        assertEquals("POSTGRES", request.getDbType());
        verify(registry).refresh("old", saved);
    }

    private static VisDatasource datasource(Long id, String sourceName, String dbType) {
        VisDatasource row = new VisDatasource()
                .setSourceName(sourceName)
                .setDbType(dbType)
                .setStatus(FieldConst.EBL);
        row.setId(id);
        return row;
    }
}
