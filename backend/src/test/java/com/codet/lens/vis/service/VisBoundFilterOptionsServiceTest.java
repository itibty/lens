package com.codet.lens.vis.service;

import com.codet.lens.common.FieldConst;
import com.codet.lens.vis.dto.dataset.VisBoundFilterOptionsRequest;
import com.codet.lens.vis.dto.dataset.VisFilterOptionsRequest;
import com.codet.lens.vis.dto.dataset.VisFilterOptionsResponse;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VisBoundFilterOptionsServiceTest {

    private final VisDashboardAccess dashboardAccess = mock(VisDashboardAccess.class);
    private final VisDashboardMapper dashboardMapper = mock(VisDashboardMapper.class);
    private final VisFilterOptionsService filterOptionsService = mock(VisFilterOptionsService.class);
    private final VisBoundFilterOptionsService service =
            new VisBoundFilterOptionsService(dashboardAccess, dashboardMapper, filterOptionsService);

    @Test
    void bindsDatasetAndFieldsFromSavedDashboardConfig() {
        VisDashboard dashboard = new VisDashboard()
                .setStatus(FieldConst.EBL)
                .setConfigJson("""
                        {"filters":[{"uid":"region","options":{"source":"dataset","datasetId":"9101",
                          "field":"region_code","labelField":"region_name"}}]}
                        """);
        when(dashboardMapper.selectById(100L)).thenReturn(dashboard);
        when(filterOptionsService.list(org.mockito.ArgumentMatchers.any()))
                .thenReturn(new VisFilterOptionsResponse());
        VisBoundFilterOptionsRequest request = new VisBoundFilterOptionsRequest();
        request.setKeyword("华");
        request.setValues(List.of("east"));
        request.setLimit(20);

        service.list(100L, "region", request);

        verify(dashboardAccess).assertCanView(100L);
        ArgumentCaptor<VisFilterOptionsRequest> captor =
                ArgumentCaptor.forClass(VisFilterOptionsRequest.class);
        verify(filterOptionsService).list(captor.capture());
        VisFilterOptionsRequest bound = captor.getValue();
        assertEquals(9101L, bound.getDatasetId());
        assertEquals("region_code", bound.getField());
        assertEquals("region_name", bound.getLabelField());
        assertEquals("华", bound.getKeyword());
        assertEquals(List.of("east"), bound.getValues());
        assertEquals(20, bound.getLimit());
    }
}
