package com.codet.lens.common.config;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LensPropertiesValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void jwtSecretHasNoCodeDefaultAndIsRequired() {
        LensProperties properties = new LensProperties();

        assertNull(properties.getJwtSecret());
        assertFalse(validator.validate(properties).isEmpty());
    }

    @Test
    void applicationContextFailsWhenJwtSecretIsMissing() {
        new ApplicationContextRunner()
                .withUserConfiguration(TestConfig.class)
                .run(context -> assertNotNull(context.getStartupFailure()));
    }

    @Test
    void applicationContextStartsWhenJwtSecretIsConfigured() {
        new ApplicationContextRunner()
                .withUserConfiguration(TestConfig.class)
                .withPropertyValues("lens.jwt-secret=test-secret")
                .run(context -> assertTrue(context.isRunning()));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(LensProperties.class)
    static class TestConfig {
    }
}
