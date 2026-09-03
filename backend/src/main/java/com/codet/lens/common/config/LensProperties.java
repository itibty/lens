package com.codet.lens.common.config;

import jakarta.validation.constraints.NotBlank;
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
}
