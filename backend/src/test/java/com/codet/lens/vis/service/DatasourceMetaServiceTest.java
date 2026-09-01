package com.codet.lens.vis.service;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DatasourceMetaServiceTest {

    @Test
    void parsesOnlyTablesFromCurrentScopeAndKeepsOrder() {
        Set<String> tables = DatasourceMetaService.parseTableNames(
                "lens.vis_card, other.hidden, vis_dataset, lens.vis_card", "lens");

        assertEquals(List.of("vis_card", "vis_dataset"), List.copyOf(tables));
    }

    @Test
    void formatsColumnTypeWithSizeAndScale() {
        assertEquals("varchar(50)", DatasourceMetaService.typeDesc("varchar", 50, 0));
        assertEquals("decimal(12,2)", DatasourceMetaService.typeDesc("decimal", 12, 2));
        assertEquals("date", DatasourceMetaService.typeDesc("date", null, null));
    }
}
