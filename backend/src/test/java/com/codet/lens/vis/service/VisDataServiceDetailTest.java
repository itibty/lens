package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.vis.dto.query.DetailQueryRequest;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class VisDataServiceDetailTest {
    @Test
    void missingSelectedFieldsDoesNotOpenDatasetOrQueryAllColumns() {
        var datasets = mock(VisDatasetService.class);
        var service = new VisDataService(datasets);
        var request = new DetailQueryRequest();
        request.setQuery(VisDetailRules.readQuery("{\"datasetId\":10,\"metrics\":[{\"field\":\"amount\",\"agg\":\"SUM\"}]}"));

        assertThrows(ResultException.class, () -> service.queryDetail(request));
        request.setSelectFields(List.of());
        assertThrows(ResultException.class, () -> service.queryDetail(request));
        verifyNoInteractions(datasets);
    }
}
