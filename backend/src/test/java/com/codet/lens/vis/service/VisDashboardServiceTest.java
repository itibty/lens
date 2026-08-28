package com.codet.lens.vis.service;

import com.codet.lens.common.FieldConst;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.sys.service.PermissionTokenService;
import com.codet.lens.vis.entity.VisDashboard;
import com.codet.lens.vis.mapper.VisCardMapper;
import com.codet.lens.vis.mapper.VisDashGroupMapper;
import com.codet.lens.vis.mapper.VisDashboardCardMapper;
import com.codet.lens.vis.mapper.VisDashboardMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VisDashboardServiceTest {

    private final VisDashboardMapper dashboardMapper = mock(VisDashboardMapper.class);
    private final PermissionTokenService permissionTokenService = mock(PermissionTokenService.class);
    private final VisDashboardService service = new VisDashboardService(
            dashboardMapper,
            mock(VisDashboardCardMapper.class),
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

    private static VisDashboard dashboard(Long id, String status) {
        VisDashboard row = new VisDashboard();
        row.setId(id);
        row.setStatus(status);
        return row;
    }
}
