package com.codet.lens.common.logging;

import ch.qos.logback.classic.LoggerContext;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.annotation.Configuration;

import static org.junit.jupiter.api.Assertions.*;

class LoggingConfigurationTest {
    @TempDir
    Path temp;

    @Test
    void defaultStartupOnlyWritesConsole() throws Exception {
        String output = runProbe();
        assertTrue(output.contains("PROBE_INFO_中文"));
        assertTrue(output.contains("traceId=probe-trace"));
        assertFalse(output.contains("PROBE_DEBUG"));
        assertFalse(Files.exists(temp.resolve("logs")));
    }

    @Test
    void fileModeSeparatesLevelsKeepsStackAndCleansOldHistory() throws Exception {
        Path logs = Files.createDirectories(temp.resolve("logs"));
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Shanghai"));
        Path expired = Files.writeString(logs.resolve("info." + today.minusDays(10) + ".log"), "expired");
        Path recent = Files.writeString(logs.resolve("info." + today.minusDays(2) + ".log"), "recent");
        String output = runProbe("--lens.logging.mode=file");
        assertFalse(output.contains("PROBE_"), output);
        for (String level : List.of("info", "warn", "error")) {
            String content = Files.readString(logs.resolve(level + ".log"));
            assertTrue(content.contains("PROBE_" + level.toUpperCase()));
            assertTrue(content.contains("traceId=probe-trace"));
            for (String other : List.of("debug", "info", "warn", "error")) {
                if (!other.equals(level)) {
                    assertFalse(content.contains("PROBE_" + other.toUpperCase()), content);
                }
            }
        }
        assertTrue(Files.readString(logs.resolve("error.log")).contains("IllegalStateException: probe-failure"));
        assertEquals("", Files.readString(logs.resolve("debug.log")));
        assertFalse(Files.exists(expired));
        assertTrue(Files.exists(recent));
    }

    @Test
    void enablesDebugThroughStandardLoggerLevelOverride() throws Exception {
        runProbe("--lens.logging.mode=file", "--logging.level.com.codet.lens=DEBUG");
        assertTrue(Files.readString(temp.resolve("logs/debug.log")).contains("PROBE_DEBUG"));
        assertFalse(Files.readString(temp.resolve("logs/info.log")).contains("PROBE_DEBUG"));
    }

    // 独立 JVM 验证真实 Spring Boot 日志初始化，避免重置测试进程的全局 Logback。
    private String runProbe(String... args) throws Exception {
        String classpath = Arrays.stream(System.getProperty("surefire.test.class.path",
                        System.getProperty("java.class.path")).split(File.pathSeparator))
                .map(path -> Path.of(path).toAbsolutePath().toString())
                .collect(Collectors.joining(File.pathSeparator));
        List<String> command = new ArrayList<>(List.of(
                Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-cp", classpath, Probe.class.getName()));
        command.addAll(List.of(args));
        Path output = temp.resolve("console.txt");
        ProcessBuilder builder = new ProcessBuilder(command).directory(temp.toFile())
                .redirectErrorStream(true).redirectOutput(output.toFile());
        builder.environment().keySet().removeIf(key -> key.startsWith("LENS_LOG_")
                || key.startsWith("LOGGING_") || key.startsWith("SPRING_"));
        Process process = builder.start();
        try {
            assertTrue(process.waitFor(30, TimeUnit.SECONDS), "logging probe timed out");
            String text = Files.readString(output);
            assertEquals(0, process.exitValue(), text);
            return text;
        } finally {
            if (process.isAlive()) {
                process.destroyForcibly();
            }
        }
    }

    @Configuration(proxyBeanMethods = false)
    public static class Probe {
        public static void main(String[] args) {
            SpringApplication application = new SpringApplication(Probe.class);
            application.setWebApplicationType(WebApplicationType.NONE);
            application.setBannerMode(Banner.Mode.OFF);
            application.setRegisterShutdownHook(false);
            try (var context = application.run(args)) {
                MDC.put(TraceContext.KEY, "probe-trace");
                var logger = LoggerFactory.getLogger("com.codet.lens.logging.Probe");
                logger.debug("PROBE_DEBUG");
                logger.info("PROBE_INFO_中文");
                logger.warn("PROBE_WARN");
                logger.error("PROBE_ERROR", new IllegalStateException("probe-failure"));
                MDC.clear();
            } finally {
                ((LoggerContext) LoggerFactory.getILoggerFactory()).stop();
            }
        }
    }
}
