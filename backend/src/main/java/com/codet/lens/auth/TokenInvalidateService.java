package com.codet.lens.auth;

import com.codet.lens.common.LensProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * 按用户打失效时间戳。鉴权时 token.iatMs 早于该时间即 401。
 * 与 data-work {@code auth:invalidate:} 同一套，Lens 单端只写 global。
 */
@Service
@RequiredArgsConstructor
public class TokenInvalidateService {

    static final String KEY_PREFIX = "lens:auth:invalidate:";
    private static final String FIELD_GLOBAL = "global";

    private final StringRedisTemplate redis;
    private final LensProperties properties;

    public void invalidate(Long userId) {
        if (userId == null) {
            return;
        }
        String key = KEY_PREFIX + userId;
        redis.opsForHash().put(key, FIELD_GLOBAL, String.valueOf(System.currentTimeMillis()));
        redis.expire(key, Duration.ofMillis(properties.getJwtTtlMs()));
    }

    public boolean isInvalidated(AuthUser user) {
        if (user == null) {
            return true;
        }
        Long userId = AuthContext.parseUserId(user.getSubject());
        return userId == null || isInvalidated(userId, user.getIatMs());
    }

    public boolean isInvalidated(long userId, long iatMs) {
        Object raw = redis.opsForHash().get(KEY_PREFIX + userId, FIELD_GLOBAL);
        if (raw == null) {
            return false;
        }
        try {
            long invalidateAt = Long.parseLong(raw.toString());
            return invalidateAt > 0 && iatMs < invalidateAt;
        } catch (NumberFormatException ignored) {
            return false;
        }
    }
}
