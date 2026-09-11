package com.codet.lens.vis.subscription;

import com.codet.lens.common.config.JacksonConfig;
import com.codet.lens.vis.dto.subscription.DashboardSubscriptionInfo;
import com.codet.lens.vis.dto.subscription.DashboardSubscriptionRunInfo;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.assertEquals;

class DashboardSubscriptionSerializationTest {
    @Test
    void returnsEpochStringsForScheduleAndRunTimes() {
        var builder = JsonMapper.builder();
        new JacksonConfig().longAsStringCustomizer().customize(builder);
        var mapper = builder.build();
        var subscription = new DashboardSubscriptionInfo();
        subscription.setNextFireAt(1789088400000L);
        var run = new DashboardSubscriptionRunInfo();
        run.setScheduledAt(1789088400000L);
        run.setStartedAt(1789088400100L);
        run.setFinishedAt(1789088400200L);
        assertEquals("1789088400000", mapper.readTree(mapper.writeValueAsString(subscription)).get("nextFireAt").asText());
        var json = mapper.readTree(mapper.writeValueAsString(run));
        assertEquals("1789088400000", json.get("scheduledAt").asText());
        assertEquals("1789088400100", json.get("startedAt").asText());
        assertEquals("1789088400200", json.get("finishedAt").asText());
    }
}
