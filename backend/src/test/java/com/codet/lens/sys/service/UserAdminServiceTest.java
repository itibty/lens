package com.codet.lens.sys.service;

import com.codet.lens.common.auth.TokenInvalidateService;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.sys.dto.user.ResetRolesRequest;
import com.codet.lens.sys.dto.user.SaveUserRequest;
import com.codet.lens.sys.dto.user.UserRoleInfo;
import com.codet.lens.sys.entity.SysRole;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.entity.SysUserRole;
import com.codet.lens.sys.mapper.SysRoleMapper;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.sys.mapper.SysUserRoleMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserAdminServiceTest {

    private final SysUserMapper userMapper = mock(SysUserMapper.class);
    private final SysUserRoleMapper userRoleMapper = mock(SysUserRoleMapper.class);
    private final SysRoleMapper roleMapper = mock(SysRoleMapper.class);
    private final TokenInvalidateService tokenInvalidateService = mock(TokenInvalidateService.class);
    private final UserAdminService service = new UserAdminService(
            userMapper,
            userRoleMapper,
            roleMapper,
            tokenInvalidateService);

    @Test
    void preservesDisabledStatusWhenEditOmitsStatus() {
        SysUser user = new SysUser();
        user.setId(10L);
        user.setUsername("disabled-user");
        user.setRealName("禁用用户");
        user.setStatus(Status.DBL);
        when(userMapper.selectById(10L)).thenReturn(user);

        SaveUserRequest request = new SaveUserRequest();
        request.setId(10L);
        request.setUsername("renamed-user");
        request.setRealName("新名称");

        service.save(request);

        assertEquals(Status.DBL, user.getStatus());
        verify(tokenInvalidateService, never()).invalidate(10L);
    }

    @Test
    void rejectsMissingRoleBeforeReplacingUserRoles() {
        SysUser user = new SysUser();
        user.setId(10L);
        when(userMapper.selectById(10L)).thenReturn(user);
        when(roleMapper.selectBatchIds(any())).thenReturn(List.of());
        ResetRolesRequest request = resetRoles(10L, 20L);

        assertThrows(ResultException.class, () -> service.resetRoles(request));

        verify(userRoleMapper, never()).delete(any());
    }

    @Test
    void deduplicatesRoleAssignments() {
        SysUser user = new SysUser();
        user.setId(10L);
        SysRole role = new SysRole();
        role.setId(20L);
        when(userMapper.selectById(10L)).thenReturn(user);
        when(roleMapper.selectBatchIds(any())).thenReturn(List.of(role));
        ResetRolesRequest request = resetRoles(10L, 20L, 20L);

        service.resetRoles(request);

        verify(userRoleMapper, times(1)).insert(any(SysUserRole.class));
    }

    private static ResetRolesRequest resetRoles(Long userId, Long... roleIds) {
        ResetRolesRequest request = new ResetRolesRequest();
        request.setUserId(userId);
        request.setRoleInfos(java.util.Arrays.stream(roleIds).map(roleId -> {
            UserRoleInfo info = new UserRoleInfo();
            info.setRoleId(roleId);
            return info;
        }).toList());
        return request;
    }
}
