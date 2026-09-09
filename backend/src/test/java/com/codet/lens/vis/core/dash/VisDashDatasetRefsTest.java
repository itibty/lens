package com.codet.lens.vis.core.dash;

import com.codet.lens.common.base.ResultException;
import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class VisDashDatasetRefsTest {
    @Test
    void collectsFilterAndOptionsIndependentlyIncludingParameterBindings() {
        var refs = VisDashDatasetRefs.collect("""
                {"filters":[
                  {"datasetId":"10","field":"region","label":"区域","applyAs":"param",
                   "options":{"source":"dataset","datasetId":10}},
                  {"datasetId":"99","field":"department",
                   "options":{"source":"dataset","datasetId":"10"}}
                ]}
                """, Set.of(10L));
        assertEquals(3, refs.size());
        assertEquals("FILTER", refs.get(0).getType());
        assertEquals("区域", refs.get(0).getName());
        assertEquals("OPTIONS", refs.get(1).getType());
        assertEquals("department", refs.get(2).getName());
    }

    @Test
    void matchesExactLongIdsAndIgnoresManualOptionResidue() {
        var refs = VisDashDatasetRefs.collect("""
                {"filters":[
                  {"datasetId":9007199254740993,"field":"a"},
                  {"datasetId":"90071992547409930","field":"b"},
                  {"datasetId":"20","field":"c","options":{"source":"manual","datasetId":"9007199254740993"}}
                ]}
                """, Set.of(9007199254740993L));
        assertEquals(1, refs.size());
        assertEquals("a", refs.getFirst().getName());
    }

    @Test
    void handlesUnconfiguredFiltersAndMissingOptionalFields() {
        assertTrue(VisDashDatasetRefs.collect(null, Set.of(1L)).isEmpty());
        assertTrue(VisDashDatasetRefs.collect("{}", Set.of(1L)).isEmpty());
        assertTrue(VisDashDatasetRefs.collect("{\"filters\":[null,{}, {\"datasetId\":\"bad\"}]}", Set.of(1L)).isEmpty());
    }

    @Test
    void doesNotTreatMalformedConfigurationAsNoReferences() {
        assertThrows(ResultException.class, () -> VisDashDatasetRefs.collect("{", Set.of(1L)));
        assertThrows(ResultException.class, () -> VisDashDatasetRefs.collect("[]", Set.of(1L)));
        assertThrows(ResultException.class, () -> VisDashDatasetRefs.collect("{\"filters\":{}}", Set.of(1L)));
    }
}
