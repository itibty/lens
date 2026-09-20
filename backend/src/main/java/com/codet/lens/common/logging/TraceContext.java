package com.codet.lens.common.logging;

import java.util.Map;
import java.util.UUID;
import org.slf4j.MDC;

/** 有明确生命周期的日志上下文，退出时恢复当前线程原有的 MDC。 */
public final class TraceContext implements AutoCloseable {
    public static final String HEADER = "X-Trace-Id";
    public static final String KEY = "traceId";

    private final Map<String, String> previous;

    private TraceContext(Map<String, String> context) {
        previous = MDC.getCopyOfContextMap();
        restore(context);
    }

    public static TraceContext open(String traceId) {
        return new TraceContext(Map.of(KEY, traceId));
    }

    public static TraceContext start() {
        return open(newId());
    }

    public static String newId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    /** 在提交任务时捕获，在执行线程内安装并恢复，支持线程复用和同步执行。 */
    public static Runnable wrap(Runnable task) {
        Map<String, String> captured = MDC.getCopyOfContextMap();
        return () -> {
            try (TraceContext ignored = new TraceContext(captured)) {
                task.run();
            }
        };
    }

    @Override
    public void close() {
        restore(previous);
    }

    private static void restore(Map<String, String> context) {
        if (context == null) {
            MDC.clear();
        } else {
            MDC.setContextMap(context);
        }
    }
}
