package com.codet.lens.vis.subscription;

public interface DashboardSubscriptionSender {
    String channelType();

    void validateAvailable();

    void send(DashboardSubscriptionMessage message);
}
