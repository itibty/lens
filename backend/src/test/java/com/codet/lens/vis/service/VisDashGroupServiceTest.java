package com.codet.lens.vis.service;

import com.codet.lens.common.FieldConst;
import com.codet.lens.sys.service.PermissionTokenService;
import com.codet.lens.vis.entity.VisDashGroup;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisDashGroupMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VisDashGroupServiceTest {

    private final VisDashGroupMapper groupMapper = mock(VisDashGroupMapper.class);
    private final VisDashboardMapper dashboardMapper = mock(VisDashboardMapper.class);
    private final VisDashboardAccess dashboardAccess = mock(VisDashboardAccess.class);
    private final PermissionTokenService permissionTokenService = mock(PermissionTokenService.class);
    private final VisDashGroupService service =
            new VisDashGroupService(groupMapper, dashboardMapper, dashboardAccess, permissionTokenService);

    @Test
    void assignTreeDoesNotPromoteDashboardUnderDisabledAncestor() {
        mockDisabledAncestorData();

        assertTrue(service.assignTree().getList().isEmpty());
    }

    @Test
    void reportTreeDoesNotPromoteDashboardUnderDisabledAncestor() {
        mockDisabledAncestorData();
        when(dashboardAccess.assignedDashboardIds()).thenReturn(Set.of(10L));

        assertTrue(service.reportTree().getList().isEmpty());
    }

    @Test
    void invalidatesAssignedUsersWhenGroupToggled() {
        when(groupMapper.selectById(1L)).thenReturn(group(1L, 0L, FieldConst.EBL));
        when(groupMapper.selectList(any())).thenReturn(List.of());
        VisDashboard dashboard = new VisDashboard();
        dashboard.setId(10L);
        when(dashboardMapper.selectList(any())).thenReturn(List.of(dashboard));

        service.toggle(1L);

        verify(permissionTokenService).invalidateDashboardUsers(List.of(10L));
    }

    private void mockDisabledAncestorData() {
        VisDashGroup parent = group(1L, 0L, FieldConst.DBL);
        VisDashGroup child = group(2L, 1L, FieldConst.EBL);
        VisDashboard dashboard = new VisDashboard().setGroupId(2L).setStatus(FieldConst.EBL);
        dashboard.setId(10L);
        when(groupMapper.selectList(any())).thenReturn(List.of(parent, child));
        when(dashboardMapper.selectList(any())).thenReturn(List.of(dashboard));
    }

    private static VisDashGroup group(Long id, Long pid, String status) {
        VisDashGroup group = new VisDashGroup();
        group.setId(id);
        group.setPid(pid);
        group.setStatus(status);
        return group;
    }
}
