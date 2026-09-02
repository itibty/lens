package com.codet.lens.vis.service;

import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.auth.AuthUser;
import com.codet.lens.sys.mapper.SysRoleDashboardMapper;
import com.codet.lens.vis.mapper.VisDashboardCardMapper;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VisDashboardAccessTest {

    private final SysRoleDashboardMapper roleDashboardMapper = mock(SysRoleDashboardMapper.class);
    private final VisDashboardVisibilityService visibility = mock(VisDashboardVisibilityService.class);
    private final VisDashboardAccess access = new VisDashboardAccess(
            roleDashboardMapper,
            mock(VisDashboardCardMapper.class),
            visibility
    );

    @AfterEach
    void clearAuth() {
        AuthContext.clear();
    }

    @Test
    void assignedDashboardsSkipQueryWhenJwtHasNoRoles() {
        bindAuth(Set.of());

        assertEquals(Set.of(), access.assignedDashboardIds());
        verify(roleDashboardMapper, never()).findDashboardIdsByRoleCodes(any());
    }

    @Test
    void assignedDashboardsQueryByJwtRoleCodes() {
        bindAuth(Set.of("analyst"));
        when(roleDashboardMapper.findDashboardIdsByRoleCodes(Set.of("analyst"))).thenReturn(List.of(8L, 9L));
        when(visibility.filterVisibleDashboardIds(Set.of(8L, 9L))).thenReturn(Set.of(8L));

        assertEquals(Set.of(8L), access.assignedDashboardIds());
    }

    private static void bindAuth(Set<String> roles) {
        AuthUser auth = new AuthUser();
        auth.setSubject("1");
        auth.setRoles(new HashSet<>(roles));
        AuthContext.set(auth);
    }
}
