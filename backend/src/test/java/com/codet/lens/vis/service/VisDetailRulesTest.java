package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.dataset.ConfSqlFieldInfo;
import com.codet.lens.vis.dto.item.OrderItem;
import com.codet.lens.vis.dto.query.DetailConfig;
import com.codet.lens.vis.dto.query.DetailQueryRequest;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class VisDetailRulesTest {
    private final VisDatasetService datasets = mock(VisDatasetService.class);
    private final VisDetailRules service = new VisDetailRules(datasets);
    private static final String SOURCE = "{\"datasetId\":10,\"dimensions\":[{\"field\":\"date\",\"timeGrain\":\"month\",\"label\":\"月份\"}],\"metrics\":[{\"field\":\"amount\",\"label\":\"销售额\",\"agg\":\"SUM\"}],\"limit\":10}";

    @BeforeEach
    void fields() {
        when(datasets.listFields(10L)).thenReturn(List.of(field("date"), field("amount"), field("order_id")));
    }

    @Test
    void explicitFieldsUseIndependentDefaultLimit() {
        var request = request();
        request.getDetail().setFields(List.of("date", "amount"));
        service.resolve(request);
        assertEquals(List.of("date", "amount"), request.getSelectFields());
        assertEquals(1000, request.getQuery().getLimit());
        assertNull(request.getQuery().getOrderList());
    }

    @Test
    void missingConfigurationOrFieldsNeverFallsBackToQueryFields() {
        var request = request();
        assertThrows(ResultException.class, () -> service.resolve(request));
        request.setDetail(null);
        assertThrows(ResultException.class, () -> service.resolve(request));
        verifyNoInteractions(datasets);
    }

    @Test
    void customColumnsKeepOrderAndUseTheirOwnSortAndLimit() {
        var request = request();
        request.getDetail().setFields(List.of("order_id", "amount", "date"));
        request.getDetail().setLimit(25);
        var order = new OrderItem();
        order.setField("date");
        order.setDir("desc");
        request.getDetail().setOrderList(List.of(order));
        service.resolve(request);
        assertEquals(List.of("order_id", "amount", "date"), request.getSelectFields());
        assertEquals(25, request.getQuery().getLimit());
        assertEquals("date", request.getQuery().getOrderList().getFirst().getField());
        assertEquals("desc", request.getQuery().getOrderList().getFirst().getDir());
    }

    @Test
    void unknownEmptyFieldsInvalidSortAndExcessiveLimitFailClosed() {
        var request = request();
        request.getDetail().setFields(List.of("secret"));
        assertThrows(ResultException.class, () -> service.resolve(request));
        request.getDetail().setFields(List.of());
        assertThrows(ResultException.class, () -> service.resolve(request));
        request.getDetail().setFields(List.of("amount"));
        var order = new OrderItem();
        order.setField("date");
        order.setDir("desc");
        request.getDetail().setOrderList(List.of(order));
        assertThrows(ResultException.class, () -> service.resolve(request));
        request.getDetail().setOrderList(null);
        request.getDetail().setLimit(5001);
        assertThrows(ResultException.class, () -> service.resolve(request));
    }

    @Test
    void pivotKeepsBothDimensionAxesForClickContextWithoutAddingUnselectedFields() {
        var request = request();
        request.setQuery(VisDetailRules.readQuery("{\"datasetId\":10,\"rowDimensions\":[{\"field\":\"order_id\"}],\"colDimensions\":[{\"field\":\"date\",\"timeGrain\":\"month\"}],\"metrics\":[{\"field\":\"amount\",\"agg\":\"SUM\"}]}"));
        request.getDetail().setFields(List.of("amount"));
        service.resolve(request);
        assertEquals(List.of("amount"), request.getSelectFields());
        assertEquals("order_id", request.getQuery().getDimensions().getFirst().getField());
        assertEquals("month", request.getQuery().getDimensions().get(1).getTimeGrain());
    }

    @Test
    void savingEnabledHistoricalCardsRequiresExplicitFields() {
        for (String visual : List.of(
                "{\"allowDetail\":true}",
                "{\"allowDetail\":true,\"detail\":{}}",
                "{\"allowDetail\":true,\"detail\":{\"fields\":[]}}")) {
            assertThrows(ResultException.class, () -> service.validateSaved(SOURCE, visual));
        }
        assertDoesNotThrow(() -> service.validateSaved(SOURCE, "{\"allowDetail\":false}"));
    }

    @Test
    void saveValidatesDetailFieldsAndIgnoresObsoleteTargetRules() {
        assertThrows(ResultException.class, () -> service.validateSaved(SOURCE,
                "{\"allowDetail\":true,\"detail\":{\"fields\":[\"missing\"]}}"));
        assertDoesNotThrow(() -> service.validateSaved(SOURCE,
                "{\"allowDetail\":true,\"detail\":{\"fields\":[\"amount\"],\"rules\":[{\"targetCardId\":99}]}}"));
    }

    private DetailQueryRequest request() {
        var request = new DetailQueryRequest();
        request.setQuery(VisDetailRules.readQuery(SOURCE));
        request.setDetail(new DetailConfig());
        return request;
    }

    private ConfSqlFieldInfo field(String name) {
        var field = new ConfSqlFieldInfo();
        field.setField(name);
        return field;
    }
}
