package com.codet.lens.common.config;

import java.io.IOException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySourcesPropertyResolver;
import org.springframework.core.io.ClassPathResource;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ApplicationConfigurationTest {

    @Test
    void keepsLocalDevelopmentDefaults() throws IOException {
        PropertySourcesPropertyResolver resolver = resolver(Map.of());

        assertEquals("jdbc:mysql://127.0.0.1:3306/lens?useUnicode=true&characterEncoding=UTF-8&serverTimezone=Asia/Shanghai",
                resolver.getProperty("spring.datasource.url"));
        assertEquals("root", resolver.getProperty("spring.datasource.username"));
        assertEquals("Aa123456", resolver.getProperty("spring.datasource.password"));
        assertEquals("127.0.0.1", resolver.getProperty("spring.data.redis.host"));
        assertEquals("6379", resolver.getProperty("spring.data.redis.port"));
        assertEquals("Aa123456", resolver.getProperty("spring.data.redis.password"));
        assertEquals("lens-dev-token-secret-change-me", resolver.getProperty("lens.jwt-secret"));
        assertEquals("43200000", resolver.getProperty("lens.jwt-ttl-ms"));
    }

    @Test
    void acceptsEnvironmentStyleOverrides() throws IOException {
        PropertySourcesPropertyResolver resolver = resolver(Map.of(
                "LENS_DB_URL", "jdbc:mysql://db.internal:3306/lens_prod",
                "LENS_DB_USERNAME", "lens_app",
                "LENS_DB_PASSWORD", "db-secret",
                "LENS_REDIS_HOST", "redis.internal",
                "LENS_REDIS_PORT", "6380",
                "LENS_REDIS_PASSWORD", "redis-secret",
                "LENS_JWT_SECRET", "production-jwt-secret-with-32-bytes",
                "LENS_JWT_TTL_MS", "7200000"
        ));

        assertEquals("jdbc:mysql://db.internal:3306/lens_prod", resolver.getProperty("spring.datasource.url"));
        assertEquals("lens_app", resolver.getProperty("spring.datasource.username"));
        assertEquals("db-secret", resolver.getProperty("spring.datasource.password"));
        assertEquals("redis.internal", resolver.getProperty("spring.data.redis.host"));
        assertEquals("6380", resolver.getProperty("spring.data.redis.port"));
        assertEquals("redis-secret", resolver.getProperty("spring.data.redis.password"));
        assertEquals("production-jwt-secret-with-32-bytes", resolver.getProperty("lens.jwt-secret"));
        assertEquals("7200000", resolver.getProperty("lens.jwt-ttl-ms"));
    }

    private static PropertySourcesPropertyResolver resolver(Map<String, Object> overrides) throws IOException {
        MutablePropertySources sources = new MutablePropertySources();
        if (!overrides.isEmpty()) {
            sources.addFirst(new MapPropertySource("environment", overrides));
        }
        new YamlPropertySourceLoader()
                .load("application", new ClassPathResource("application.yml"))
                .forEach(sources::addLast);
        return new PropertySourcesPropertyResolver(sources);
    }
}
