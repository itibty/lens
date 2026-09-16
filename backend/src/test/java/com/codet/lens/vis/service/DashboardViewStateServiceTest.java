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
    private final VisCardMapper cards = mock(VisCardMapper.class);
    private final DashboardViewStateService service = new DashboardViewStateService(datasets, fields, cards);
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

    @Test void changedBindingUsesCurrentDefaultAndRemovedFiltersAreIgnored() throws Exception {
        var saved = service.snapshot(dashboard, """
                {"schemaVersion":1,"filters":{"region":{"value":["华北"]}}}
                """, null);
        when(datasets.selectById(10L)).thenReturn(new VisDataset().setSourceId(2L).setStatus(Status.EBL));
        var resolved = service.snapshot(dashboard, saved.stateJson(), saved.bindingsJson());
        assertEquals("华东", json.readTree(resolved.stateJson()).at("/filters/region/value/0").asText());
        dashboard.setConfigJson("{} ");
        assertTrue(json.readTree(service.snapshot(dashboard, saved.stateJson(), saved.bindingsJson()).stateJson()).path("filters").isEmpty());
    }

    @Test void incompatibleValuesUseDefaultWithoutChangingOtherFilters() throws Exception {
        var state = service.snapshot(dashboard, """
                {"schemaVersion":2,"filters":{"region":{"value":["a","b"]},"date":{"value":[]}},"tabs":{}}
                """, null);
        var parsed = json.readTree(state.stateJson());
        assertEquals("华东", parsed.at("/filters/region/value/0").asText());
        assertTrue(parsed.at("/filters/date/value").isEmpty());
        assertFalse(parsed.path("filters").path("date").has("valueExp"));
        when(fields.selectOne(any())).thenReturn(null);
        var unavailable = json.readTree(service.snapshot(dashboard, state.stateJson(), state.bindingsJson()).stateJson());
        assertTrue(unavailable.at("/filters/region/value").isEmpty());
    }

    @Test void tabsUseStableGroupAndCardIdsAndFallbackToCurrentOrder() throws Exception {
        when(cards.selectById(11L)).thenReturn(new VisCard().setCardName("销售额").setStatus(Status.EBL));
        when(cards.selectById(12L)).thenReturn(new VisCard().setCardName("利润").setStatus(Status.EBL));
        dashboard.setConfigJson("""
                {"widgets":[{"kind":"group","id":"g","mode":"tabs","title":"经营指标","pages":[
                  {"id":"p1","items":[{"cardId":"11"}]},{"id":"p2","title":"毛利","items":[{"cardId":"12"}]}]}]}
                """);
        String state = """
                {"schemaVersion":2,"filters":{},"tabs":{"g":{"activeCardId":"12"},"removed":{"activeCardId":"99"}}}
                """;
        var selected = service.snapshot(dashboard, state, null);
        assertEquals("12", json.readTree(selected.stateJson()).at("/tabs/g/activeCardId").asText());
        assertEquals("经营指标：毛利", selected.summary());
        assertFalse(json.readTree(selected.stateJson()).path("tabs").has("removed"));
        dashboard.setConfigJson(dashboard.getConfigJson().replace("p2", "rebuilt-page"));
        assertEquals(selected.stateJson(), service.snapshot(dashboard, state, null).stateJson());
        when(cards.selectById(12L)).thenReturn(new VisCard().setCardName("利润").setStatus(Status.DBL));
        assertEquals("12", json.readTree(service.snapshot(dashboard, state, null).stateJson()).at("/tabs/g/activeCardId").asText());
        when(cards.selectById(12L)).thenReturn(null);
        assertEquals("11", json.readTree(service.snapshot(dashboard, state, null).stateJson()).at("/tabs/g/activeCardId").asText());
        assertEquals("11", json.readTree(service.snapshot(dashboard, null, null).stateJson()).at("/tabs/g/activeCardId").asText());
        dashboard.setConfigJson(dashboard.getConfigJson().replace("tabs", "tile"));
        assertTrue(json.readTree(service.snapshot(dashboard, state, null).stateJson()).path("tabs").isEmpty());
    }

    @Test void changedDefaultDoesNotRewriteSavedExplicitValue() throws Exception {
        var saved = service.snapshot(dashboard, null, null);
        dashboard.setConfigJson(dashboard.getConfigJson().replace("华东", "华南"));
        var resolved = service.snapshot(dashboard, saved.stateJson(), saved.bindingsJson());
        assertEquals("华东", json.readTree(resolved.stateJson()).at("/filters/region/value/0").asText());
    }

    @Test void rejectsUnknownVersionsNamespacesAndIncompleteFilters() throws Exception {
        for (String state : new String[]{"{\"schemaVersion\":3}", "{\"schemaVersion\":\"1\"}",
                "{\"schemaVersion\":1,\"ui\":{}}", "{\"schemaVersion\":1,\"filters\":[]}",
                "{\"schemaVersion\":2,\"tabs\":[]}"}) {
            assertThrows(ResultException.class, () -> service.snapshot(dashboard, state, null));
        }
        var range = json.readTree("{\"formType\":\"numberRange\"}");
        assertThrows(ResultException.class, () -> DashboardViewStateService.normalize(range, json.readTree("{\"value\":[1]}")));
        assertThrows(ResultException.class, () -> DashboardViewStateService.normalize(range, json.readTree("{\"value\":[1,\"bad\"]}")));
        var exp = json.readTree("{\"formType\":\"dateExp\"}");
        assertThrows(ResultException.class, () -> DashboardViewStateService.normalize(exp, json.readTree("{\"valueExp\":\"last_days\",\"value\":[0]}")));
    }
}
