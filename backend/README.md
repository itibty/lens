# Lens 后端

JDK 21 + Spring Boot 4.1，提供登录鉴权、系统管理和可视化配置 / 查数接口。

## 功能

- JWT 登录，角色、菜单、权限；Redis 用于登录态失效
- 数据源、数据集、卡片、看板的配置
- 按查询配置生成 SQL 并查数，支持透视表和导出
- SpringDoc OpenAPI

## 目录

| 路径 | 说明 |
|------|------|
| `src/main/java/com/codet/lens/common/` | 鉴权、通用响应、配置 |
| `src/main/java/com/codet/lens/sys/` | 账号、角色、菜单 |
| `src/main/java/com/codet/lens/vis/` | 数据集、卡片、看板、查数 |
| `db/` | `schema.sql`：应用结构和当前数据；`demo.sql`：示例订单结构和数据 |

## 命令

```shell
# 建库 lens 后执行 db/schema.sql；查询示例看板时再执行 db/demo.sql

# 启动  http://127.0.0.1:8080
mvn -DskipTests spring-boot:run

# 打包
mvn -DskipTests package

# 测试
mvn test
```

- Swagger：`http://127.0.0.1:8080/swagger-ui.html`
- 库：本机 MySQL `lens`，默认 `root` / `Aa123456`
- Redis：`127.0.0.1:6379`，密码 `Aa123456`（禁用/改密/改角色后旧 token 立刻失效）

以上为本地开发默认值。可以复制 `config/local.properties.example` 到
`config/local.properties`，填写 `LENS_*` 配置项（值不加引号）。从 `backend/` 启动时自动加载，
环境变量优先；本地文件已加入 Git 忽略规则。部署时可通过环境变量覆盖：

| 环境变量 | 用途 |
|----------|------|
| `LENS_DB_URL` | JDBC 地址 |
| `LENS_DB_USERNAME` / `LENS_DB_PASSWORD` | 数据库账号密码 |
| `LENS_REDIS_HOST` / `LENS_REDIS_PORT` / `LENS_REDIS_PASSWORD` | Redis 连接 |
| `LENS_JWT_SECRET` / `LENS_JWT_TTL_MS` | JWT 签名密钥与有效期（毫秒） |

### 看板邮件订阅

邮件订阅默认关闭。`db/schema.sql` 已包含订阅表的最新结构，以及当前账号、邮箱、权限、
数据源、数据集、卡片、看板和订阅执行数据，不再维护增量变更脚本。
`db/demo.sql` 仅保存 `dwd_retail_order` 示例订单表的结构和当前 21,252 条数据；
导入示例订单不会覆盖当前的数据集或看板配置。
两个脚本用于初始化或重置开发库，会重建各自的表；均采用 UTF-8 并显式设置 `SET NAMES utf8mb4`。
数据源连接信息保持快照原值，换环境时按实际地址和账号调整。

部署机可安装 Playwright Chromium：

```shell
mvn exec:java -Dexec.mainClass=com.microsoft.playwright.CLI -Dexec.args="install chromium"
```

如机器已安装 Chrome，也可不下载 Chromium，改用
`LENS_BROWSER_CHANNEL=chrome` 或 `LENS_BROWSER_EXECUTABLE_PATH`。

| 环境变量 | 用途 |
|----------|------|
| `LENS_SUBSCRIPTION_ENABLED` | 是否启用定时扫描和截图，默认 `false` |
| `LENS_PUBLIC_BASE_URL` | Chromium 及邮件链接访问的 Lens 地址，需能打开已构建的前端 |
| `LENS_MAIL_HOST` / `LENS_MAIL_PORT` | SMTP 服务器和端口 |
| `LENS_MAIL_USERNAME` / `LENS_MAIL_PASSWORD` | SMTP 账号密码 |
| `LENS_MAIL_FROM` | 发件人地址，未配置时测试发送会返回明确错误 |
| `LENS_MAIL_AUTH` / `LENS_MAIL_STARTTLS` | SMTP 认证与 STARTTLS 开关 |
| `LENS_MAIL_SSL` | 是否使用 SMTP 隐式 SSL（如 163 邮箱的 465 端口） |
| `LENS_SUBSCRIPTION_POLL_INTERVAL_MS` | 到期任务扫描间隔，默认 30 秒 |
| `LENS_SCREENSHOT_TIMEOUT_MS` | 单次截图超时，默认 60 秒 |
| `LENS_MAX_SCREENSHOT_BYTES` | 单张 PNG 大小上限，默认 10 MiB |
| `LENS_BROWSER_CHANNEL` | 可选的本机浏览器通道，如已安装 Chrome 时设为 `chrome` |
| `LENS_BROWSER_EXECUTABLE_PATH` | 可选的浏览器可执行文件绝对路径，优先于 channel |

`LENS_PUBLIC_BASE_URL` 必须与用户实际访问的站点同源，并由后端路由提供 SPA 页面。
邮件中使用 CID 内嵌 PNG 并同时提供受权限保护的看板链接，不使用 iframe。

调度时在同一事务中推进计划并写入 `QUEUED` 记录；每个实例使用单线程从数据库领取任务。
`QUEUED` 在重启后继续处理，真正开始执行才转为 `RUNNING`；每 30 秒更新心跳，
超过 5 分钟没有心跳的任务标记失败，不自动重发可能已被 SMTP 接收的邮件。
只有明确的用户禁用、邮箱缺失、权限失效或看板不可用才自动停用订阅，临时故障最多尝试两次。
订阅截图要求所有卡片查询完成且可用；部分卡片失败时不发邮件。
页面显示排队/发送/最终结果，并可查看最近 20 次执行记录。订阅接口中的时间统一为毫秒时间戳字符串。

真实 MySQL 回归测试按需运行（账号需有创建、删除临时数据库的权限）：

```shell
LENS_TEST_DB_URL=jdbc:mysql://127.0.0.1:3306/lens mvn test
```

可通过 `LENS_TEST_DB_USERNAME`、`LENS_TEST_DB_PASSWORD` 覆盖测试账号。
测试只在随机命名的 `lens_subscription_test_*` 临时库中建表，并在结束后删除临时库；
不会重置现有 `lens` 数据库，截图与邮件发送使用测试替身。未设置 URL 时跳过这些数据库测试。

已安装 Chrome 时可额外运行浏览器回归：

```shell
LENS_TEST_BROWSER=chrome mvn -Dtest=DashboardScreenshotServiceBrowserTest test
```

该测试使用临时本地页面验证下载成功与失败握手，不连接业务页面或 SMTP。

也可以在仓库根目录运行 `./verify.sh`，一次完成后端测试和全部前端检查。

## 参考

[Spring Boot](https://docs.spring.io/spring-boot/documentation.html)  
[MyBatis-Plus](https://baomidou.com/)  
[SpringDoc](https://springdoc.org/)  
