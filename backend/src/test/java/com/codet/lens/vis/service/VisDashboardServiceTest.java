package com.codet.lens.vis.service;

import com.codet.lens.common.FieldConst;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.sys.service.PermissionTokenService;
import com.codet.lens.vis.dto.dash.VisDashboardSaveRequest;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDashGroupMapper;
import com.codet.lens.vis.mapper.VisDashboardCardMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VisDashboardServiceTest {

    private final VisDashboardMapper dashboardMapper = mock(VisDashboardMapper.class);
    private final VisDashboardCardMapper dashboardCardMapper = mock(VisDashboardCardMapper.class);
    private final PermissionTokenService permissionTokenService = mock(PermissionTokenService.class);
    private final VisDashboardService service = new VisDashboardService(
            dashboardMapper,
            dashboardCardMapper,
            mock(VisCardMapper.class),
            mock(SysRoleDashboardMapper.class),
            mock(VisDashGroupMapper.class),
            mock(VisDashGroupService.class),
            mock(VisDashboardAccess.class),
            permissionTokenService);

    @Test
    void invalidatesAssignedUsersWhenDashboardToggled() {
        when(dashboardMapper.selectById(9501L)).thenReturn(dashboard(9501L, FieldConst.EBL));

        service.toggleStatus(9501L);

        verify(permissionTokenService).invalidateDashboardUsers(9501L);
    }

    @Test
    void invalidatesAssignedUsersBeforeDeletingDashboards() {
        service.delete(List.of(9501L, 9502L));

        verify(permissionTokenService).invalidateDashboardUsers(List.of(9501L, 9502L));
    }

    @Test
    void invalidatesAssignedUsersWhenFullSaveChangesMetadata() {
        VisDashboard previous = dashboard(9501L, FieldConst.EBL);
        previous.setDashName("旧名称");
        when(dashboardMapper.selectById(9501L)).thenReturn(previous);
        VisDashboardSaveRequest request = new VisDashboardSaveRequest();
        request.setId(9501L);
        request.setDashName("新名称");
        request.setStatus(FieldConst.EBL);
        request.setGroupId(0L);
        request.setConfigJson("{\"widgets\":[]}");
        request.setCards(List.of());

        service.save(request);

        verify(permissionTokenService).invalidateDashboardUsers(9501L);
    }

    @Test
    void invalidatesAssignedUsersWhenDashboardsMoveGroup() {
        VisDashboard first = dashboard(9501L, FieldConst.EBL);
        first.setGroupId(1L);
        VisDashboard second = dashboard(9502L, FieldConst.EBL);
        second.setGroupId(1L);
        when(dashboardMapper.selectById(9501L)).thenReturn(first);
        when(dashboardMapper.selectById(9502L)).thenReturn(second);

        service.moveGroup(List.of(9501L, 9502L), 0L);

        verify(permissionTokenService).invalidateDashboardUsers(List.of(9501L, 9502L));
    }

    @Test
    void doesNotInvalidateAssignedUsersWhenFullSaveOnlyChangesLayout() {
        VisDashboard previous = dashboard(9501L, FieldConst.EBL);
        previous.setDashName("经营看板");
        when(dashboardMapper.selectById(9501L)).thenReturn(previous);
        VisDashboardSaveRequest request = new VisDashboardSaveRequest();
        request.setId(9501L);
        request.setDashName("经营看板");
        request.setStatus(FieldConst.EBL);
        request.setGroupId(0L);
        request.setConfigJson("{\"widgets\":[]}");
        request.setCards(List.of());

        service.save(request);

        verify(permissionTokenService, never()).invalidateDashboardUsers(9501L);
        verify(dashboardCardMapper).delete(any());
    }

    @Test
    void rejectsFullSaveWithoutWidgetsBeforeClearingAssociations() {
        VisDashboardSaveRequest request = new VisDashboardSaveRequest();
        request.setDashName("经营看板");
        request.setStatus(FieldConst.EBL);
        request.setConfigJson("{}");
        request.setCards(List.of());

        var error = assertThrows(RuntimeException.class, () -> service.save(request));

        assertEquals("看板配置必须包含 widgets 数组", error.getMessage());
        verify(dashboardCardMapper, never()).delete(any());
        verify(dashboardMapper, never()).insert(any(VisDashboard.class));
    }

    private static VisDashboard dashboard(Long id, String status) {
        VisDashboard row = new VisDashboard();
        row.setId(id);
        row.setStatus(status);
        row.setGroupId(0L);
        return row;
    }
}
