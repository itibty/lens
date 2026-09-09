package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.codet.lens.vis.entity.*;
import com.codet.lens.vis.mapper.*;
import java.util.List;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DatasetReferenceServiceTest {
    private final VisDatasetMapper datasets = mock(VisDatasetMapper.class);
    private final VisCardMapper cards = mock(VisCardMapper.class);
    private final VisDashboardMapper dashboards = mock(VisDashboardMapper.class);
    private final VisDashboardCardMapper links = mock(VisDashboardCardMapper.class);
    private final VisDashGroupMapper groups = mock(VisDashGroupMapper.class);
    private final DatasetReferenceService service = new DatasetReferenceService(datasets, cards, dashboards, links, groups);

    @Test
    void mergesMultipleCardsAndFilterSourcesIntoOneDashboard() {
        when(datasets.selectById(10L)).thenReturn(new VisDataset().setStatus(Status.EBL));
        VisCard first = new VisCard().setCardName("销售额");
        first.setId(20L);
        VisCard second = new VisCard().setCardName("订单量");
        second.setId(21L);
        when(cards.selectList(any())).thenReturn(List.of(first, second));
        when(links.selectList(any())).thenReturn(List.of(
                new VisDashboardCard().setCardId(20L).setDashboardId(30L),
                new VisDashboardCard().setCardId(21L).setDashboardId(30L)));
        when(dashboards.selectList(any())).thenReturn(List.of(dashboard("""
                {"filters":[{"datasetId":"10","field":"region","options":{"source":"dataset","datasetId":"10"}}]}
                """)));

        var result = service.listDashboards(10L).getList();

        assertEquals(1, result.size());
        assertEquals(4, result.getFirst().getReferences().size());
        assertEquals("DBL", result.getFirst().getStatus());
        assertEquals("报表中心", result.getFirst().getGroupName());
    }

    @Test
    void blocksDeletionForStandaloneFilterOptionsSource() {
        when(dashboards.selectList(any())).thenReturn(List.of(dashboard("""
                {"filters":[{"datasetId":"99","field":"region","options":{"source":"dataset","datasetId":"10"}}]}
                """)));
        ResultException error = assertThrows(ResultException.class,
                () -> service.assertNoDashboardReferences(List.of(10L)));
        assertTrue(error.getMsg().contains("销售概览"));
        verifyNoInteractions(links);
    }

    @Test
    void rejectsDeletedDatasetAndAllowsUnreferencedDeletion() {
        when(datasets.selectById(10L)).thenReturn(new VisDataset().setStatus(Status.DEL));
        assertThrows(ResultException.class, () -> service.listDashboards(10L));
        assertDoesNotThrow(() -> service.assertNoDashboardReferences(List.of(10L)));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void findsReferencesAfterAFullBatchAndResolvesTheirGroup() {
        when(datasets.selectById(10L)).thenReturn(new VisDataset().setStatus(Status.EBL));
        List<VisDashboard> firstBatch = LongStream.rangeClosed(1, 200).mapToObj(id -> {
            VisDashboard dashboard = dashboard("{}");
            dashboard.setId(id);
            return dashboard;
        }).toList();
        VisDashboard referenced = dashboard("{\"filters\":[{\"datasetId\":\"10\",\"field\":\"region\"}]}");
        referenced.setId(201L);
        referenced.setGroupId(7L);
        VisDashGroup group = new VisDashGroup().setGroupName("销售报表");
        group.setId(7L);
        when(dashboards.selectList(any())).thenReturn(firstBatch, List.of(referenced));
        when(groups.selectList(any())).thenReturn(List.of(group));

        var result = service.listDashboards(10L).getList();

        assertEquals(1, result.size());
        assertEquals(201L, result.getFirst().getId());
        assertEquals("销售报表", result.getFirst().getGroupName());
        ArgumentCaptor<QueryWrapper<VisDashboard>> queries = ArgumentCaptor.forClass(QueryWrapper.class);
        verify(dashboards, times(2)).selectList(queries.capture());
        var nextBatch = queries.getAllValues().getLast();
        assertTrue(nextBatch.getSqlSegment().contains("id >"));
        assertTrue(nextBatch.getParamNameValuePairs().containsValue(200L));
        verify(groups, times(1)).selectList(any());
    }

    @Test
    void skipsQueriesForEmptyDeletionAndRejectsUnreadableDashboardConfig() {
        service.assertNoDashboardReferences(List.of());
        verifyNoInteractions(cards, dashboards, links, groups);
        when(dashboards.selectList(any())).thenReturn(List.of(dashboard("{")));
        assertThrows(ResultException.class, () -> service.assertNoDashboardReferences(List.of(10L)));
    }

    private static VisDashboard dashboard(String config) {
        VisDashboard dashboard = new VisDashboard().setDashName("销售概览").setGroupId(0L)
                .setStatus(Status.DBL).setConfigJson(config);
        dashboard.setId(30L);
        return dashboard;
    }
}
