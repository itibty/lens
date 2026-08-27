package com.codet.lens.vis.service;

import com.codet.lens.common.FieldConst;
import com.codet.lens.common.ResultException;
import com.codet.lens.vis.entity.VisCard;
import com.codet.lens.vis.entity.VisDataset;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDatasetFieldMapper;
import com.codet.lens.vis.mapper.VisDatasetMapper;
import com.codet.lens.vis.mapper.VisDatasourceMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
        VisDataset dataset = new VisDataset().setStatus(FieldConst.EBL);
        dataset.setId(10L);
        VisCard card = new VisCard().setCardName("区域营收").setStatus(FieldConst.EBL);
        card.setId(20L);
        when(datasetMapper.selectById(10L)).thenReturn(dataset);
        when(cardMapper.selectList(any())).thenReturn(List.of(card));

        ResultException error = assertThrows(ResultException.class,
                () -> service.delete(List.of(10L)));

        assertEquals("数据集被 1 张卡片引用，请先处理卡片：区域营收", error.getMsg());
        verify(datasetMapper, never()).updateById(any(VisDataset.class));
    }
}
