# 看板邮件订阅实施计划

日期：2026-09-10

状态：已实施，待人工验收

设计依据：`docs/superpowers/specs/2026-09-10-dashboard-email-subscriptions-design.md`

## 实施顺序

1. **数据库与账号邮箱。** 为 `sys_user` 增加唯一可空邮箱；新增订阅和运行记录表；同步实体、用户 DTO、管理接口与测试。
2. **订阅领域。** 实现频率配置校验、下一次执行时间计算、所有者隔离、看板权限校验和 CRUD/测试发送接口。
3. **调度与去重。** 增加持久化到期扫描、唯一运行记录、有限重试和串行任务执行器；功能默认关闭。
4. **截图执行。** 集成 Playwright Java，使用短期用户 Token 打开现有看板预览，触发当前一键截屏并取得 PNG。
5. **邮件渠道。** 集成 `JavaMailSender`、CID 图片模板、超时和配置诊断；抽象发送器接口。
6. **前端入口。** 生成 vis API 客户端，增加看板订阅抽屉、频率表单、列表和测试发送反馈。
7. **自动验证。** 覆盖调度计算、所有权/权限、去重和配置关闭场景；运行后端测试、前端 lint、类型检查、测试和构建。
8. **人工验收文档。** 输出 SMTP、真实 Chromium、截图视觉、定时执行、权限撤销和失败恢复 TODO。

## 实现约束

- 不手工修改 `frontend/src/apis/vis/**`；由运行中的后端 OpenAPI 生成。
- 现有看板截图行为是唯一截图口径，不维护第二套服务端布局。
- 首版只向订阅所有者绑定邮箱发送。
- 订阅调度关闭时 CRUD 仍可用；测试发送返回明确配置错误。
- 运行记录只保存元数据，不保存 PNG 或认证状态。
- 不在本次引入 Flyway/Liquibase；完整安装更新 `schema.sql`，现有本机库使用明确的增量 DDL 验证。

## 自动检查

- [x] `mvn test`；
- [x] `pnpm lint`；
- [x] `pnpm type-check`；
- [x] `pnpm test`（15 个测试文件，151 个用例）；
- [x] `pnpm build`；
- [x] `git diff --check`；
- [x] 最新代码连接本机 MySQL/Redis 启动成功，vis OpenAPI 可生成；
- [x] 本机 MySQL 增量 DDL 已应用并核对邮箱字段和两张订阅表。

真实 163 SMTP、本机系统 Chrome 的端到端执行及 QQ 邮箱收件已验证成功；
多邮件客户端视觉效果、定时调度及异常恢复仍保留在
`docs/testing/2026-09-10-dashboard-email-subscriptions-manual-todo.md`。

## 交付物

- 设计规格；
- 实施代码和数据库 DDL；
- 自动测试；
- 部署配置说明；
- 独立人工验证 TODO 文档。
