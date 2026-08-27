package com.codet.lens.vis.core.dash;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class VisDashFiltersTest {

    @Test
    void resolvesDatasetOptionSourceBySavedFilterUid() {
        String config = """
                {"filters":[
                  {"uid":"region","options":{"source":"dataset","datasetId":"9101",
                    "field":"region_code","labelField":"region_name"}}
                ]}
                """;

        VisDashFilters.OptionSource source = VisDashFilters.optionSource(config, "region");

        assertEquals(9101L, source.datasetId());
        assertEquals("region_code", source.field());
        assertEquals("region_name", source.labelField());
    }

    @Test
    void rejectsUnknownOrManualFilterSources() {
        String config = """
                {"filters":[{"uid":"region","options":{"source":"manual","datasetId":"9101","field":"region"}}]}
                """;

        assertNull(VisDashFilters.optionSource(config, "region"));
        assertNull(VisDashFilters.optionSource(config, "unknown"));
    }
}
