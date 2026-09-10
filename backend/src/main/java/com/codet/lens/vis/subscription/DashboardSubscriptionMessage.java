package com.codet.lens.vis.subscription;

public record DashboardSubscriptionMessage(
        String subscriptionName,
        String dashboardName,
        String recipientEmail,
        String dashboardUrl,
        long generatedAt,
        byte[] screenshot) {
}
