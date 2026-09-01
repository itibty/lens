package com.codet.lens.vis.service;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.vis.core.dash.VisDashFilters;
import com.codet.lens.vis.dto.dataset.VisBoundFilterOptionsRequest;
import com.codet.lens.vis.dto.dataset.VisFilterOptionsRequest;
import com.codet.lens.vis.dto.dataset.VisFilterOptionsResponse;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 看板查看态筛选枚举：数据集和字段只从已保存的看板配置解析。
 */
@Service
@RequiredArgsConstructor
public class VisBoundFilterOptionsService {

    private final VisDashboardAccess dashboardAccess;
    private final VisDashboardMapper dashboardMapper;
    private final VisFilterOptionsService filterOptionsService;

    public VisFilterOptionsResponse list(Long dashboardId, String filterUid,
                                         VisBoundFilterOptionsRequest request) {
        dashboardAccess.assertCanView(dashboardId);
        VisDashboard dashboard = dashboardMapper.selectById(dashboardId);
        if (dashboard == null || Status.DEL.equals(dashboard.getStatus())) {
            throw ResultException.fail("看板不存在");
        }
        if (Status.DBL.equals(dashboard.getStatus()) && !dashboardAccess.canDesign()) {
            throw ResultException.fail("看板已禁用");
        }
        VisDashFilters.OptionSource source =
                VisDashFilters.optionSource(dashboard.getConfigJson(), filterUid);
        if (source == null) {
            throw ResultException.fail("筛选项不存在或未配置数据集选项");
        }

        VisFilterOptionsRequest bound = new VisFilterOptionsRequest();
        bound.setDatasetId(source.datasetId());
        bound.setField(source.field());
        bound.setLabelField(source.labelField());
        if (request != null) {
            bound.setKeyword(request.getKeyword());
            bound.setValues(request.getValues());
            bound.setLimit(request.getLimit());
        }
        return filterOptionsService.list(bound);
    }
}
