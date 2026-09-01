package com.codet.lens.sys.service;

import com.codet.lens.common.auth.TokenInvalidateService;
import com.codet.lens.common.base.Status;
import com.codet.lens.sys.dto.user.SaveUserRequest;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.mapper.SysRoleMapper;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.sys.mapper.SysUserRoleMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserAdminServiceTest {

    private final SysUserMapper userMapper = mock(SysUserMapper.class);
    private final TokenInvalidateService tokenInvalidateService = mock(TokenInvalidateService.class);
    private final UserAdminService service = new UserAdminService(
            userMapper,
            mock(SysUserRoleMapper.class),
            mock(SysRoleMapper.class),
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
}
