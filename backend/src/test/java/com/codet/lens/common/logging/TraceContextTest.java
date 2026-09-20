package com.codet.lens.common.logging;

import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

import static org.junit.jupiter.api.Assertions.*;

class TraceContextTest {
    @AfterEach
    void clear() {
        MDC.clear();
    }

    @Test
    void propagatesSnapshotAndRestoresReusedWorkerEvenOnFailure() throws Exception {
        try (var executor = Executors.newSingleThreadExecutor()) {
            executor.submit(() -> MDC.put("worker", "original")).get(5, TimeUnit.SECONDS);
            MDC.put(TraceContext.KEY, "request-one");
            Runnable task = TraceContext.wrap(() -> {
                assertEquals(Map.of(TraceContext.KEY, "request-one"), MDC.getCopyOfContextMap());
                throw new IllegalStateException("task failed");
            });
            MDC.put(TraceContext.KEY, "request-two");
            executor.submit(() -> assertThrows(IllegalStateException.class, task::run)).get(5, TimeUnit.SECONDS);
            assertEquals(Map.of("worker", "original"),
                    executor.submit(MDC::getCopyOfContextMap).get(5, TimeUnit.SECONDS));
            assertEquals("request-two", MDC.get(TraceContext.KEY));
        }
    }

    @Test
    void taskWithoutContextDoesNotInheritWorkerState() {
        Runnable task = TraceContext.wrap(() -> assertNull(MDC.get(TraceContext.KEY)));
        MDC.put(TraceContext.KEY, "worker-old-request");
        task.run();
        assertEquals("worker-old-request", MDC.get(TraceContext.KEY));
    }
}
