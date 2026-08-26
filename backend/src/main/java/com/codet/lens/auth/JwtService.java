package com.codet.lens.auth;

import cn.hutool.core.util.IdUtil;
import cn.hutool.jwt.JWT;
import cn.hutool.jwt.JWTPayload;
import cn.hutool.jwt.JWTUtil;
import cn.hutool.jwt.JWTValidator;
import cn.hutool.jwt.signers.JWTSignerUtil;
import com.codet.lens.common.LensProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtService {
    private static final String CLAIM_ROLES = "roles";
    private static final String CLAIM_PERMS = "perms";

    private final LensProperties properties;

    public String createToken(String userId, Collection<String> roles, Collection<String> perms, long expiresAt) {
        return JWT.create()
                .setSubject(userId)
                .setJWTId(IdUtil.fastSimpleUUID())
                .setExpiresAt(new Date(expiresAt))
                .setPayload(CLAIM_ROLES, roles)
                .setPayload(CLAIM_PERMS, perms)
                .setKey(properties.getJwtSecret().getBytes(StandardCharsets.UTF_8))
                .sign();
    }

    public AuthUser parse(String token) {
        try {
            JWTValidator.of(token)
                    .validateAlgorithm(JWTSignerUtil.hs256(properties.getJwtSecret().getBytes(StandardCharsets.UTF_8)))
                    .validateDate(new Date());
        } catch (Exception e) {
            return null;
        }
        JWTPayload payload = JWTUtil.parseToken(token).getPayload();
        AuthUser user = new AuthUser();
        user.setSubject(String.valueOf(payload.getClaim(JWTPayload.SUBJECT)));
        user.setRoles(toStringSet(payload.getClaim(CLAIM_ROLES)));
        user.setPerms(toStringSet(payload.getClaim(CLAIM_PERMS)));
        return user;
    }

    @SuppressWarnings("unchecked")
    private static Set<String> toStringSet(Object claim) {
        Set<String> set = new HashSet<>();
        if (claim instanceof Collection<?> col) {
            for (Object item : col) {
                if (item != null) {
                    set.add(item.toString());
                }
            }
        }
        return set;
    }
}
