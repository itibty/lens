package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.entity.*;
import com.codet.lens.vis.mapper.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DashboardViewStateServiceTest {
    private final VisDatasetMapper datasets = mock(VisDatasetMapper.class);
    private final VisDatasetFieldMapper fields = mock(VisDatasetFieldMapper.class);
    private final DashboardViewStateService service = new DashboardViewStateService(datasets, fields);
    private final ObjectMapper json = new ObjectMapper();
    private final VisDashboard dashboard = new VisDashboard().setConfigJson("""
        {"filters":[{"uid":"region","datasetId":"10","field":"region","label":"地区","applyAs":"filter",
          "formType":"select","op":"eq","defaultValue":{"value":["华东"]}},
          {"uid":"date","datasetId":"10","field":"order_date","label":"订单日期","formType":"dateExp",
          "defaultValue":{"value":[],"valueExp":"last_day"}}]}
        """);

    @BeforeEach void seed() {
        when(datasets.selectById(10L)).thenReturn(new VisDataset().setSourceId(1L).setStatus(Status.EBL));
        when(fields.selectOne(any())).thenReturn(new VisDatasetField().setDataType("string"));
    }

    @Test void explicitEmptyOverridesDefaultAndMissingUsesDefault() throws Exception {
        var defaults = service.snapshot(dashboard, null, null);
        assertEquals("华东", json.readTree(defaults.stateJson()).at("/filters/region/value/0").asText());
        var empty = service.snapshot(dashboard, "{\"schemaVersion\":1,\"filters\":{\"region\":{\"value\":[]}}}", null);
        assertTrue(json.readTree(empty.stateJson()).at("/filters/region/value").isEmpty());
        assertEquals("last_day", json.readTree(empty.stateJson()).at("/filters/date/valueExp").asText());
    }

    @Test void changedBindingOrRemovedFilterCannotSilentlyBroadenSavedView() {
        var saved = service.snapshot(dashboard, null, null);
        when(datasets.selectById(10L)).thenReturn(new VisDataset().setSourceId(2L).setStatus(Status.EBL));
        assertThrows(ResultException.class, () -> service.snapshot(dashboard, saved.stateJson(), saved.bindingsJson()));
        dashboard.setConfigJson("{\"filters\":[]}");
        assertThrows(ResultException.class, () -> service.snapshot(dashboard, saved.stateJson(), saved.bindingsJson()));
    }

    @Test void changedDefaultDoesNotRewriteSavedExplicitValue() throws Exception {
        var saved = service.snapshot(dashboard, null, null);
        dashboard.setConfigJson(dashboard.getConfigJson().replace("华东", "华南"));
        var resolved = service.snapshot(dashboard, saved.stateJson(), saved.bindingsJson());
        assertEquals("华东", json.readTree(resolved.stateJson()).at("/filters/region/value/0").asText());
    }

    @Test void rejectsUnknownVersionsNamespacesAndIncompleteFilters() throws Exception {
        for (String state : new String[]{"{\"schemaVersion\":2}", "{\"schemaVersion\":\"1\"}",
                "{\"schemaVersion\":1,\"ui\":{}}", "{\"schemaVersion\":1,\"filters\":[]}",
                "{\"schemaVersion\":1,\"filters\":{\"removed\":{}}}"}) {
            assertThrows(ResultException.class, () -> service.snapshot(dashboard, state, null));
        }
        var range = json.readTree("{\"formType\":\"numberRange\"}");
        assertThrows(ResultException.class, () -> DashboardViewStateService.normalize(range, json.readTree("{\"value\":[1]}")));
        assertThrows(ResultException.class, () -> DashboardViewStateService.normalize(range, json.readTree("{\"value\":[1,\"bad\"]}")));
        var exp = json.readTree("{\"formType\":\"dateExp\"}");
        assertThrows(ResultException.class, () -> DashboardViewStateService.normalize(exp, json.readTree("{\"valueExp\":\"last_days\",\"value\":[0]}")));
    }
}
