# 看板邮件订阅设计

日期：2026-09-10

## 目标

允许有权查看看板的 Lens 用户为同一看板创建多个独立发送计划。计划到期后，系统以订阅所有者的当前权限加载看板，复用现有完整截图能力生成 PNG，并通过邮件发送截图与看板链接。

首版定位为定时分发，不包含数据阈值告警。

## 首版范围

- 看板查看者管理自己的订阅；看板设计权限不是前置条件。
- 一条订阅对应一个频率；同一看板可创建多条订阅。
- UI 提供每天、工作日、每周、每月四类频率，不直接暴露 Cron。
- 每条订阅保存明确时区，默认 `Asia/Shanghai`。
- 邮件是首个渠道；发送器使用渠道接口，保留后续飞书等实现位置。
- 邮件包含内嵌 PNG、生成时间和受权限保护的看板链接。
- 支持立即测试发送、启用/停用、删除，以及最近执行记录。
- 定时执行失败后重试一次；不保存历史截图文件。

## 明确不做

- 指标条件、异常恢复和告警状态机；
- 用户输入任意 Cron；
- 每个订阅覆盖看板筛选条件；
- PDF、Excel、多页拼接和历史截图中心；
- 在邮件中嵌入 iframe；
- 外部匿名分享或邮件内免登录访问；
- 首版飞书、Slack、Webhook 渠道实现。

## 用户体验

看板预览工具栏增加“订阅”入口。抽屉展示当前用户在当前看板上的订阅，支持新增、编辑、停用、删除和测试发送。

每条订阅包含：

- 名称；
- 频率类型及对应的发送时间/星期/月中日期；
- 时区；
- 接收邮箱；
- 状态、上次发送结果和下次执行时间。

首版接收邮箱来自当前 Lens 用户已绑定邮箱，不允许订阅者填写任意地址。`sys_user` 增加唯一可空的 `email` 字段；没有邮箱时不能启用或测试订阅。

## 权限与数据边界

1. 创建、查询、修改、删除和测试订阅均限定为当前用户自己的记录。
2. 创建和测试时调用现有看板访问校验。
3. 定时执行前重新读取所有者、角色、权限和看板授权；账号、角色、看板或数据集变化立即生效。
4. 权限不再满足时不发送截图，执行记录标记失败并停用订阅。
5. 邮件链接只打开普通看板预览页，收件人仍需登录并按自己的权限访问。
6. 截图反映订阅所有者可见的数据。首版仅发给所有者本人，避免把所有者权限下的数据分发给第三方。

## 数据模型

### `vis_dashboard_subscription`

一条记录对应一个调度频率。关键字段：

- `dashboard_id`、`owner_id`；
- `subscription_name`；
- `schedule_type`：`DAILY|WEEKDAY|WEEKLY|MONTHLY`；
- `schedule_json`：本地时间、星期或月中日期；
- `timezone`；
- `channel_type`：首版固定 `EMAIL`；
- `target_json`：首版保存所有者标识，发送时再读取用户当前邮箱，不保存 SMTP 密钥；
- `next_fire_at`、`last_fire_at`；
- `status`。

### `vis_dashboard_subscription_run`

保存计划执行和手动测试的审计信息：

- 订阅、计划时间、触发类型；
- 开始/结束时间、尝试次数；
- `RUNNING|SUCCESS|FAILED|SKIPPED`；
- 截图字节数和脱敏错误摘要。

`(subscription_id, scheduled_at, trigger_type)` 建唯一键，防止同一到期点重复执行。

## 调度

Spring 固定频率扫描 `next_fire_at <= now` 的启用订阅。扫描器只负责领取任务；实际截图和邮件在线程池中串行执行，首版并发数为 1，避免 Chromium 和数据查询瞬间占用过多资源。

领取订阅时在事务内推进 `next_fire_at` 并写入唯一运行记录。即使应用重启或多个实例同时扫描，唯一约束和条件更新也能避免重复发送。调度时间统一以 epoch milliseconds 持久化；下一次时间由 `schedule_type + schedule_json + timezone` 计算。

如果应用停机或队列拥塞跨过多个发送周期，恢复后只补发一次，并将 `next_fire_at` 直接推进到当前时间之后；不逐个追补所有错过的周期，避免集中发送历史邮件。

## 截图

截图复用 `/vis/dashboards/view?id=...` 和现有 `captureDashPreview`：它已经负责等待字体、测量完整滚动内容、隐藏操作控件以及限制最大画布。

后端使用 Playwright Java 启动 Chromium：

1. 每次任务创建隔离 `BrowserContext`；
2. 后端按订阅所有者的当前角色和权限生成 2 分钟有效的临时 JWT；
3. 通过初始化脚本写入 Lens 的 `NA:access_token`，Token 不进入 URL、文件或日志；
4. 打开看板预览页并触发现有“一键截屏”；
5. 接收浏览器下载的 PNG 字节；
6. 关闭上下文并清理临时资源。

Playwright/Chromium 只在真正执行截图时创建，任务结束即关闭。未安装 Chromium 或未启用订阅功能不能影响 Lens 主应用启动。

## 邮件与渠道扩展

定义 `DashboardSubscriptionSender`：

```java
interface DashboardSubscriptionSender {
    String channelType();
    void send(SubscriptionMessage message);
}
```

首版 `EmailDashboardSubscriptionSender` 使用 Spring `JavaMailSender` 创建 multipart HTML 邮件，PNG 使用 CID 内嵌，正文同时包含看板链接。SMTP 密钥只来自部署配置。

未来渠道复用同一份截图字节，实现新的发送器并扩展 `target_json` 即可；调度、截图和运行记录不感知飞书协议。

## 配置与运行边界

- `lens.subscription.enabled` 默认 `false`；
- `lens.subscription.public-base-url` 用于浏览器访问和邮件链接；
- 截图、页面加载、SMTP 连接/读写均配置有限超时；
- 单张截图设置大小上限，超过时本次发送失败；
- 日志记录订阅 ID、运行 ID、耗时和失败阶段，不记录 Token、SMTP 密码或完整邮件地址；
- 应用关闭时释放 Chromium。

## 验收标准

1. 同一用户可为同一看板创建多个频率，`next_fire_at` 正确且互不影响。
2. 同一到期点只创建一条执行记录；重启或并发扫描不重复入队。SMTP 已接收但客户端未收到确认时，一次自动重试仍可能产生重复邮件，这是首版的已知边界。
3. 邮件显示完整截图，并包含可登录后打开的看板链接。
4. 截图数据与订阅所有者正常打开看板时一致。
5. 用户、权限或看板失效后不再发送。
6. SMTP/Chromium 未配置时应用仍可启动，并提供可理解的测试发送错误。
7. 自动测试通过，人工测试清单逐项可执行。
