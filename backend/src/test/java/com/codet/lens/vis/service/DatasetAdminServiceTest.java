package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.dto.dataset.DatasetSourceChangeWarning;
import com.codet.lens.vis.entity.VisCard;
import com.codet.lens.vis.entity.VisDataset;
import com.codet.lens.vis.entity.VisDatasetField;
import com.codet.lens.vis.entity.VisDatasource;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDatasetFieldMapper;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import com.codet.lens.vis.dto.dataset.ConfSqlContentRequest;
import com.codet.lens.vis.dto.dataset.ConfSqlFieldInfo;
import com.codet.lens.vis.dto.dataset.ConfSqlInfoRequest;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DatasetAdminServiceTest {

    private final VisDatasetMapper datasetMapper = mock(VisDatasetMapper.class);
    private final VisDatasetFieldMapper fieldMapper = mock(VisDatasetFieldMapper.class);
    private final VisDatasourceMapper datasourceMapper = mock(VisDatasourceMapper.class);
    private final VisCardMapper cardMapper = mock(VisCardMapper.class);
    private final DatasetAdminService service =
            new DatasetAdminService(datasetMapper, fieldMapper, datasourceMapper, cardMapper);

    @Test
    void blocksDeletingDatasetReferencedByActiveCards() {
        VisDataset dataset = new VisDataset().setStatus(Status.EBL);
        dataset.setId(10L);
        VisCard card = new VisCard().setCardName("区域营收").setStatus(Status.EBL);
        card.setId(20L);
        when(datasetMapper.selectById(10L)).thenReturn(dataset);
        when(cardMapper.selectList(any())).thenReturn(List.of(card));

        ResultException error = assertThrows(ResultException.class,
                () -> service.delete(List.of(10L)));

        assertEquals("数据集被 1 张卡片引用，请先处理卡片：区域营收", error.getMsg());
        verify(datasetMapper, never()).updateById(any(VisDataset.class));
    }

    @Test
    void savesScriptAndFieldsTogether() {
        VisDataset dataset = new VisDataset().setStatus(Status.EBL);
        dataset.setId(10L);
        when(datasetMapper.selectById(10L)).thenReturn(dataset);
        ConfSqlFieldInfo field = new ConfSqlFieldInfo();
        field.setField("amount");
        field.setDataType("NUMBER");
        field.setSuggestRole("METRIC");
        ConfSqlContentRequest request = new ConfSqlContentRequest();
        request.setId(10L);
        request.setSqlContent("select amount");
        request.setSqlParams("{}");
        request.setFields(List.of(field));

        service.saveContent(request);

        assertEquals("select amount", dataset.getSqlContent());
        assertEquals("{}", dataset.getParamDemo());
        verify(datasetMapper).updateById(dataset);
        verify(fieldMapper).delete(any());
        verify(fieldMapper).insert(any(VisDatasetField.class));
    }

    @Test
    void warnsBeforeChangingReferencedDatasetSource() {
        VisDataset dataset = new VisDataset().setSourceId(1L).setStatus(Status.EBL);
        dataset.setId(10L);
        VisCard first = new VisCard().setCardName("区域营收").setStatus(Status.EBL);
        first.setId(20L);
        VisCard second = new VisCard().setCardName("销售趋势").setStatus(Status.EBL);
        second.setId(21L);
        when(datasetMapper.selectById(10L)).thenReturn(dataset);
        when(datasourceMapper.selectById(2L)).thenReturn(new VisDatasource());
        when(cardMapper.selectList(any())).thenReturn(List.of(first, second));

        ResultException error = assertThrows(ResultException.class,
                () -> service.saveInfo(sourceChangeRequest(false)));

        assertEquals("更换数据源将影响 2 张引用该数据集的卡片", error.getMsg());
        DatasetSourceChangeWarning warning =
                assertInstanceOf(DatasetSourceChangeWarning.class, error.getData());
        assertEquals(DatasetSourceChangeWarning.TYPE, warning.getWarningType());
        assertEquals(2, warning.getReferenceCount());
        assertEquals(List.of("区域营收", "销售趋势"),
                warning.getCards().stream().map(card -> card.getCardName()).toList());
        verify(datasetMapper, never()).updateById(any(VisDataset.class));
    }

    @Test
    void changesReferencedDatasetSourceAfterConfirmation() {
        VisDataset dataset = new VisDataset().setSourceId(1L).setStatus(Status.EBL);
        dataset.setId(10L);
        when(datasetMapper.selectById(10L)).thenReturn(dataset);
        when(datasourceMapper.selectById(2L)).thenReturn(new VisDatasource());

        service.saveInfo(sourceChangeRequest(true));

        assertEquals(2L, dataset.getSourceId());
        verify(cardMapper, never()).selectList(any());
        verify(datasetMapper).updateById(dataset);
    }

    private static ConfSqlInfoRequest sourceChangeRequest(boolean confirmed) {
        ConfSqlInfoRequest request = new ConfSqlInfoRequest();
        request.setId(10L);
        request.setSqlName("订单数据集");
        request.setSqlDesc("订单分析");
        request.setDsId(2L);
        request.setTplEngine("ENJOY");
        request.setStatus(Status.EBL);
        request.setConfirmSourceChange(confirmed);
        return request;
    }
}
