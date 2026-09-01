package com.codet.lens.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "lens")
public class LensProperties {
    private String jwtSecret = "lens-dev-token-secret-change-me";
    private long jwtTtlMs = 43_200_000L;
}
