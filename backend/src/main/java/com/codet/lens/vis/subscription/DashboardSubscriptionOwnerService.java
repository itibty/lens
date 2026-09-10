package com.codet.lens.vis.subscription;

import com.codet.lens.common.auth.AuthContext;
import com.codet.lens.common.auth.AuthUser;
import com.codet.lens.common.auth.JwtService;
import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.base.Status;
import com.codet.lens.sys.entity.SysUser;
import com.codet.lens.sys.mapper.SysUserMapper;
import com.codet.lens.vis.service.VisDashboardAccess;
import java.util.HashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardSubscriptionOwnerService {
    private static final long RENDER_TOKEN_TTL_MS = 120_000L;

    private final SysUserMapper userMapper;
    private final VisDashboardAccess dashboardAccess;
    private final JwtService jwtService;

    public OwnerSession prepare(Long ownerId, Long dashboardId) {
        SysUser user = requireEnabledUser(ownerId);
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw ResultException.fail("订阅用户尚未绑定邮箱");
        }
        long now = System.currentTimeMillis();
        Set<String> roles = new HashSet<>(userMapper.findRoleCodes(ownerId, now));
        Set<String> perms = new HashSet<>(userMapper.findPermCodes(ownerId, now));
        AuthUser auth = new AuthUser()
                .setSubject(ownerId.toString())
                .setIatMs(now)
                .setRoles(roles)
                .setPerms(perms);
        AuthUser previousUser = AuthContext.get();
        String previousToken = AuthContext.getToken();
        AuthContext.set(auth);
        try {
            dashboardAccess.assertCanView(dashboardId);
        } finally {
            AuthContext.clear();
            if (previousUser != null) {
                AuthContext.set(previousUser);
            }
            if (previousToken != null) {
                AuthContext.setToken(previousToken);
            }
        }
        Long roleEnd = userMapper.findEarliestRoleEndAt(ownerId, now);
        long expiresAt = Math.min(now + RENDER_TOKEN_TTL_MS,
                roleEnd == null ? Long.MAX_VALUE : roleEnd);
        if (expiresAt <= now) {
            throw ResultException.fail("订阅用户的看板权限已失效");
        }
        String token = jwtService.createToken(ownerId.toString(), roles, perms, expiresAt);
        return new OwnerSession(user.getEmail().trim(), "Bearer " + token);
    }

    public SysUser requireEnabledUser(Long ownerId) {
        SysUser user = ownerId == null ? null : userMapper.selectById(ownerId);
        if (user == null || !Status.EBL.equals(user.getStatus())) {
            throw ResultException.fail("订阅用户不存在或已禁用");
        }
        return user;
    }

    public record OwnerSession(String email, String authorization) {
    }
}
