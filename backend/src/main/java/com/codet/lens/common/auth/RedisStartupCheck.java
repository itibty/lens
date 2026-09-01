package com.codet.lens.common.auth;

import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class RedisStartupCheck {

    @Bean
    ApplicationRunner redisReadyCheck(StringRedisTemplate redis) {
        return args -> {
            RedisConnectionFactory factory = redis.getConnectionFactory();
            if (factory == null) {
                throw new IllegalStateException("Redis 未配置");
            }
            try (var conn = factory.getConnection()) {
                String pong = conn.ping();
                if (pong == null) {
                    throw new IllegalStateException("Redis ping 失败");
                }
                log.info("Redis ready ({})", pong);
            }
        };
    }
}
