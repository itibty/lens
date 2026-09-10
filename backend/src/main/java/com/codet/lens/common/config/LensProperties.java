package com.codet.lens.common.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Component
@Validated
@ConfigurationProperties(prefix = "lens")
public class LensProperties {

    @NotBlank
    private String jwtSecret;

    private long jwtTtlMs = 43_200_000L;

    @Valid
    private Subscription subscription = new Subscription();

    @Getter
    @Setter
    public static class Subscription {
        private boolean enabled;
        private String publicBaseUrl = "http://127.0.0.1:8080";
        private String mailFrom;
        private long pollIntervalMs = 30_000L;
        private long screenshotTimeoutMs = 60_000L;
        private long maxScreenshotBytes = 10 * 1024 * 1024L;
        private String browserChannel;
        private String browserExecutablePath;
    }
}
