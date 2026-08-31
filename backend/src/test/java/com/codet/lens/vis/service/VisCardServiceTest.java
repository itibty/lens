package com.codet.lens.vis.service;

import com.codet.lens.common.FieldConst;
import com.codet.lens.common.ResultException;
import com.codet.lens.vis.dto.card.VisCardSaveRequest;
import com.codet.lens.vis.entity.VisCard;
import com.codet.lens.vis.entity.VisDataset;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDashboardCardMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VisCardServiceTest {

    private final VisCardMapper cardMapper = mock(VisCardMapper.class);
    private final VisDashboardCardMapper dashboardCardMapper = mock(VisDashboardCardMapper.class);
    private final VisDashboardMapper dashboardMapper = mock(VisDashboardMapper.class);
    private final VisDashboardAccess dashboardAccess = mock(VisDashboardAccess.class);
    private final VisDatasetMapper datasetMapper = mock(VisDatasetMapper.class);
    private final VisCardService service = new VisCardService(
            cardMapper, dashboardCardMapper, dashboardMapper, dashboardAccess, datasetMapper);

    @Test
    void rejectsSavingDataCardAgainstDisabledDataset() {
        VisDataset dataset = new VisDataset().setStatus(FieldConst.DBL);
        when(datasetMapper.selectById(10L)).thenReturn(dataset);
        VisCardSaveRequest request = new VisCardSaveRequest();
        request.setCardName("区域营收");
        request.setChartType("bar");
        request.setDatasetId(10L);
        request.setQueryJson("{}");

        ResultException error = assertThrows(ResultException.class, () -> service.save(request));

        assertEquals("数据集已禁用", error.getMsg());
        verify(cardMapper, never()).insert(any(VisCard.class));
    }

    @Test
    void rejectsEditingMissingCard() {
        VisCardSaveRequest request = editRequest(20L);

        ResultException error = assertThrows(ResultException.class, () -> service.save(request));

        assertEquals("卡片不存在", error.getMsg());
        verify(cardMapper, never()).update(any(VisCard.class), any());
    }

    @Test
    void rejectsEditingDeletedCard() {
        VisCard deleted = new VisCard().setStatus(FieldConst.DEL);
        deleted.setId(20L);
        when(cardMapper.selectById(20L)).thenReturn(deleted);

        ResultException error = assertThrows(ResultException.class,
                () -> service.save(editRequest(20L)));

        assertEquals("卡片不存在", error.getMsg());
        verify(cardMapper, never()).update(any(VisCard.class), any());
    }

    @Test
    void rejectsEditWhenCardWasDeletedConcurrently() {
        VisCard existing = new VisCard().setStatus(FieldConst.EBL);
        existing.setId(20L);
        when(cardMapper.selectById(20L)).thenReturn(existing);
        when(cardMapper.update(any(VisCard.class), any())).thenReturn(0);

        ResultException error = assertThrows(ResultException.class,
                () -> service.save(editRequest(20L)));

        assertEquals("卡片不存在", error.getMsg());
    }

    @Test
    void updatesExistingCard() {
        VisCard existing = new VisCard().setStatus(FieldConst.EBL);
        existing.setId(20L);
        when(cardMapper.selectById(20L)).thenReturn(existing);
        when(cardMapper.update(any(VisCard.class), any())).thenReturn(1);

        assertEquals(20L, service.save(editRequest(20L)));
    }

    @Test
    void sanitizesRichTextBeforeSaving() {
        VisCardSaveRequest request = new VisCardSaveRequest();
        request.setCardName("说明卡片");
        request.setChartType("richtext");
        request.setStatus(FieldConst.EBL);
        request.setVisualJson("""
                {"chartType":"richtext","richtext":{"html":"<p onclick=\\"steal()\\">正文</p>"}}
                """);

        service.save(request);

        ArgumentCaptor<VisCard> captor = ArgumentCaptor.forClass(VisCard.class);
        verify(cardMapper).insert(captor.capture());
        assertFalse(captor.getValue().getVisualJson().contains("onclick"));
    }

    private static VisCardSaveRequest editRequest(Long id) {
        VisCardSaveRequest request = new VisCardSaveRequest();
        request.setId(id);
        request.setCardName("说明卡片");
        request.setChartType("richtext");
        request.setStatus(FieldConst.EBL);
        request.setVisualJson("{}");
        return request;
    }
}
