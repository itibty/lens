package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
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
    private final VisBoundQueryService service = new VisBoundQueryService(
            dashboardAccess, dashboardMapper, dashboardCardMapper, cardMapper);

    @Test
    void rejectsSavedCardDetailWhenAllowDetailIsFalse() {
        mockBoundCard("{\"allowDetail\":false}");

        ResultException error = assertThrows(ResultException.class,
                () -> service.bindDetail(1L, 2L, new DetailQueryRequest()));

        assertEquals("卡片未开放明细", error.getMsg());
    }

    @Test
    void allowsSavedCardDetailOnlyWhenAllowDetailIsTrue() {
        mockBoundCard("{\"allowDetail\":true}");

        assertNotNull(service.bindDetail(1L, 2L, new DetailQueryRequest()).getQuery());
    }

    @Test
    void designerPreviewDoesNotRequireSavedAllowDetail() {
        DetailQueryRequest request = new DetailQueryRequest();

        assertEquals(request, service.bindDetail(0L, 0L, request));
    }

    private void mockBoundCard(String visualJson) {
        VisDashboard dashboard = new VisDashboard().setStatus(Status.EBL);
        dashboard.setId(1L);
        VisCard card = new VisCard()
                .setStatus(Status.EBL)
                .setQueryJson("{}")
                .setVisualJson(visualJson);
        card.setId(2L);
        when(dashboardMapper.selectById(1L)).thenReturn(dashboard);
        when(dashboardCardMapper.selectCount(any())).thenReturn(1L);
        when(cardMapper.selectById(2L)).thenReturn(card);
    }
}
