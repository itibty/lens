package com.codet.lens.vis.service;

import com.codet.lens.common.base.Status;
import com.codet.lens.sys.service.PermissionTokenService;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.entity.VisDashGroup;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import com.codet.lens.vis.mapper.VisDashGroupMapper;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
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
        when(groupMapper.selectById(1L)).thenReturn(group(1L, 0L, Status.EBL));
        when(groupMapper.selectList(any())).thenReturn(List.of());
        VisDashboard dashboard = new VisDashboard();
        dashboard.setId(10L);
        when(dashboardMapper.selectList(any())).thenReturn(List.of(dashboard));

        service.toggle(1L);

        verify(permissionTokenService).invalidateDashboardUsers(List.of(10L));
    }

    @Test
    void preservesDisabledStatusWhenEditOmitsStatus() {
        VisDashGroup group = group(1L, 0L, Status.DBL);
        group.setGroupName("旧名称");
        when(groupMapper.selectById(1L)).thenReturn(group);
        when(groupMapper.selectList(any())).thenReturn(List.of());
        when(dashboardMapper.selectList(any())).thenReturn(List.of());
        var request = new com.codet.lens.vis.dto.group.VisGroupDtos.SaveDashGroupRequest();
        request.setId(1L);
        request.setPid(0L);
        request.setGroupName("新名称");

        service.save(request);

        assertEquals(Status.DBL, group.getStatus());
    }

    private void mockDisabledAncestorData() {
        VisDashGroup parent = group(1L, 0L, Status.DBL);
        VisDashGroup child = group(2L, 1L, Status.EBL);
        VisDashboard dashboard = new VisDashboard().setGroupId(2L).setStatus(Status.EBL);
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
