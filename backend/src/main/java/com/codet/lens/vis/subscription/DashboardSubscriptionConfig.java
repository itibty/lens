package com.codet.lens.vis.subscription;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableScheduling
public class DashboardSubscriptionConfig {
    @Bean(name = "dashboardSubscriptionExecutor")
    public ThreadPoolTaskExecutor dashboardSubscriptionExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        // 待执行记录保存在数据库中，不在线程池中排队。
        executor.setQueueCapacity(0);
        executor.setThreadNamePrefix("dashboard-subscription-");
        executor.setWaitForTasksToCompleteOnShutdown(false);
        executor.initialize();
        return executor;
    }
}
