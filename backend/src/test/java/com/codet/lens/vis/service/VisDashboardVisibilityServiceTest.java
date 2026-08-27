package com.codet.lens.vis.service;

import com.codet.lens.common.FieldConst;
import com.codet.lens.vis.entity.VisDashGroup;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisDashGroupMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VisDashboardVisibilityServiceTest {

    @Test
    void requiresEveryGroupInAncestorChainToBeEnabled() {
        List<VisDashGroup> groups = List.of(
                group(1L, 0L, FieldConst.EBL),
                group(2L, 1L, FieldConst.EBL),
                group(3L, 2L, FieldConst.EBL),
                group(4L, 0L, FieldConst.DBL),
                group(5L, 4L, FieldConst.EBL),
                group(6L, 99L, FieldConst.EBL),
                group(7L, 8L, FieldConst.EBL),
                group(8L, 7L, FieldConst.EBL)
        );

        Set<Long> effective = VisDashboardVisibilityService.effectiveGroupIds(groups);

        assertEquals(Set.of(1L, 2L, 3L), effective);
    }

    @Test
    void excludesDashboardUnderIneffectiveGroupButKeepsUngroupedDashboard() {
        VisDashGroupMapper groupMapper = mock(VisDashGroupMapper.class);
        VisDashboardMapper dashboardMapper = mock(VisDashboardMapper.class);
        VisDashboardVisibilityService service =
                new VisDashboardVisibilityService(groupMapper, dashboardMapper);
        VisDashboard grouped = dashboard(10L, 2L);
        VisDashboard ungrouped = dashboard(11L, 0L);
        when(groupMapper.selectList(any())).thenReturn(List.of(
                group(1L, 0L, FieldConst.DBL),
                group(2L, 1L, FieldConst.EBL)));
        when(dashboardMapper.selectList(any())).thenReturn(List.of(grouped, ungrouped));

        Set<Long> visible = service.filterVisibleDashboardIds(Set.of(10L, 11L));

        assertEquals(Set.of(11L), visible);
    }

    private static VisDashGroup group(Long id, Long pid, String status) {
        VisDashGroup group = new VisDashGroup();
        group.setId(id);
        group.setPid(pid);
        group.setStatus(status);
        return group;
    }

    private static VisDashboard dashboard(Long id, Long groupId) {
        VisDashboard dashboard = new VisDashboard().setGroupId(groupId).setStatus(FieldConst.EBL);
        dashboard.setId(id);
        return dashboard;
    }
}
