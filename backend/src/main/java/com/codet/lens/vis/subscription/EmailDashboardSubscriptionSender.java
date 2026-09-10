package com.codet.lens.vis.subscription;

import com.codet.lens.common.base.ResultException;
import com.codet.lens.common.config.LensProperties;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.util.HtmlUtils;

@Component
@RequiredArgsConstructor
public class EmailDashboardSubscriptionSender implements DashboardSubscriptionSender {
    private static final DateTimeFormatter TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
            .withZone(ZoneId.of("Asia/Shanghai"));

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final LensProperties properties;

    @Override
    public String channelType() {
        return "EMAIL";
    }

    @Override
    public void validateAvailable() {
        if (mailSenderProvider.getIfAvailable() == null
                || properties.getSubscription().getMailFrom() == null
                || properties.getSubscription().getMailFrom().isBlank()) {
            throw ResultException.fail("邮件发送尚未配置，请设置SMTP和LENS_MAIL_FROM");
        }
    }

    @Override
    public void send(DashboardSubscriptionMessage message) {
        validateAvailable();
        try {
            JavaMailSender sender = mailSenderProvider.getObject();
            MimeMessage mime = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name());
            helper.setFrom(properties.getSubscription().getMailFrom().trim());
            helper.setTo(message.recipientEmail());
            helper.setSubject(subject(message.subscriptionName()));
            helper.setText(renderHtml(message), true);
            helper.addInline("dashboard-screenshot", new ByteArrayResource(message.screenshot()), "image/png");
            sender.send(mime);
        } catch (ResultException e) {
            throw e;
        } catch (Exception e) {
            throw ResultException.fail("邮件发送失败: " + safeMessage(e));
        }
    }

    private static String subject(String name) {
        return "[Lens 看板订阅] " + name.replaceAll("[\\r\\n]", " ");
    }

    static String renderHtml(DashboardSubscriptionMessage message) {
        String subscription = HtmlUtils.htmlEscape(message.subscriptionName());
        String dashboard = HtmlUtils.htmlEscape(message.dashboardName());
        String url = HtmlUtils.htmlEscape(message.dashboardUrl());
        String generated = TIME_FORMAT.format(Instant.ofEpochMilli(message.generatedAt()));
        return """
                <!doctype html>
                <html>
                <body style="margin:0;background:#eef2f6;font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#182230">
                  <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;background:#eef2f6">
                    <tr>
                      <td align="center" style="padding:12px 8px">
                        <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="width:100%%;max-width:1600px;background:#ffffff;border:1px solid #dfe5ec">
                          <tr>
                            <td style="padding:18px 20px;background:#101828;color:#ffffff">
                              <div style="margin:0 0 7px;font-size:11px;line-height:1;letter-spacing:2px;color:#9fb3d1">LENS · DASHBOARD BRIEF</div>
                              <h1 style="margin:0;font-size:24px;line-height:1.35;font-weight:650;color:#ffffff">%s</h1>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 20px;border-bottom:1px solid #e5eaf0;background:#f8fafc;font-size:13px;line-height:1.6;color:#526071">
                              <strong style="color:#182230">%s</strong>
                              <span style="padding:0 8px;color:#a0aaba">/</span>
                              数据生成于 %s
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:0;background:#ffffff">
                              <img src="cid:dashboard-screenshot" alt="%s" width="100%%" style="display:block;width:100%%;max-width:100%%;height:auto;border:0">
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:14px 20px;border-top:1px solid #e5eaf0;background:#ffffff">
                              <a href="%s" style="display:inline-block;padding:9px 16px;background:#155eef;color:#ffffff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600">打开 Lens 查看实时数据</a>
                              <span style="display:inline-block;margin-left:12px;font-size:12px;color:#7b8794">数据以实时页面为准</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </body></html>
                """.formatted(subscription, dashboard, generated, dashboard, url);
    }

    private static String safeMessage(Exception e) {
        String message = e.getMessage();
        return message == null || message.isBlank() ? e.getClass().getSimpleName() : message;
    }
}
