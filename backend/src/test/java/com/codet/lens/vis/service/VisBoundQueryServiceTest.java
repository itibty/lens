package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.dto.query.DetailConfig;
import com.codet.lens.vis.dto.query.DetailQueryRequest;
import com.codet.lens.vis.entity.VisCard;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDashboardCardMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VisBoundQueryServiceTest {

    private final VisDashboardAccess dashboardAccess = mock(VisDashboardAccess.class);
    private final VisDashboardMapper dashboardMapper = mock(VisDashboardMapper.class);
    private final VisDashboardCardMapper dashboardCardMapper = mock(VisDashboardCardMapper.class);
    private final VisCardMapper cardMapper = mock(VisCardMapper.class);
    private final VisDatasetService datasets = mock(VisDatasetService.class);
    private final VisBoundQueryService service = new VisBoundQueryService(
            dashboardAccess, dashboardMapper, dashboardCardMapper, cardMapper,
            new VisDetailRules(datasets));

    @Test
    void rejectsSavedCardDetailWhenAllowDetailIsFalse() {
        mockBoundCard("{\"allowDetail\":false}");

        ResultException error = assertThrows(ResultException.class,
                () -> service.bindDetail(1L, 2L, new DetailQueryRequest()));

        assertEquals("卡片未开放明细", error.getMsg());
    }

    @Test
    void allowsSavedCardDetailWhenEnabledAndFieldsAreConfigured() {
        mockBoundCard("{\"allowDetail\":true,\"detail\":{\"fields\":[\"order_id\"]}}");

        assertNotNull(service.bindDetail(1L, 2L, new DetailQueryRequest()).getQuery());
    }

    @Test
    void designerPreviewDoesNotRequireSavedAllowDetail() {
        DetailQueryRequest request = new DetailQueryRequest();
        mockBoundCard("{}");
        request.setQuery(VisDetailRules.readQuery("{\"datasetId\":10,\"dimensions\":[{\"field\":\"order_id\"}]}"));
        var detail = new DetailConfig();
        detail.setFields(java.util.List.of("order_id"));
        request.setDetail(detail);

        assertEquals(request, service.bindDetail(0L, 0L, request));
    }

    @Test
    void viewerCannotSupplyFieldsToEnableAnUnconfiguredHistoricalCard() {
        mockBoundCard("{\"allowDetail\":true}");
        var request = new DetailQueryRequest();
        var detail = new DetailConfig();
        detail.setFields(java.util.List.of("order_id"));
        request.setDetail(detail);

        ResultException error = assertThrows(ResultException.class,
                () -> service.bindDetail(1L, 2L, request));
        assertEquals("请至少选择一个明细字段", error.getMsg());
    }

    @Test
    void designerPreviewRequiresExplicitDetailFields() {
        var request = new DetailQueryRequest();
        request.setQuery(VisDetailRules.readQuery("{\"datasetId\":10,\"dimensions\":[{\"field\":\"order_id\"}]}"));
        assertThrows(ResultException.class, () -> service.bindDetail(0L, 0L, request));
    }

    @Test
    void viewerCannotOverrideSavedDetailColumnsOrRules() {
        mockBoundCard("{\"allowDetail\":true,\"detail\":{\"fields\":[\"order_id\"]}}");
        DetailQueryRequest request = new DetailQueryRequest();
        var config = new com.codet.lens.vis.dto.query.DetailConfig();
        config.setFields(java.util.List.of("private_column"));
        request.setDetail(config);
        assertEquals(java.util.List.of("order_id"), service.bindDetail(1L, 2L, request).getSelectFields());
    }

    private void mockBoundCard(String visualJson) {
        var field = new com.codet.lens.vis.dto.dataset.ConfSqlFieldInfo();
        field.setField("order_id");
        when(datasets.listFields(10L)).thenReturn(java.util.List.of(field));
        VisDashboard dashboard = new VisDashboard().setStatus(Status.EBL);
        dashboard.setId(1L);
        VisCard card = new VisCard()
                .setStatus(Status.EBL)
                .setQueryJson("{\"datasetId\":10,\"dimensions\":[{\"field\":\"order_id\"}]}")
                .setVisualJson(visualJson);
        card.setId(2L);
        when(dashboardMapper.selectById(1L)).thenReturn(dashboard);
        when(dashboardCardMapper.selectCount(any())).thenReturn(1L);
        when(cardMapper.selectById(2L)).thenReturn(card);
    }
}
