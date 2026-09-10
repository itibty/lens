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
| `db/` | `schema.sql`、`demo.sql` |

## 命令

```shell
# 建库 lens 后执行 db/schema.sql；可选 db/demo.sql

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

以上为本地开发默认值。部署时可通过环境变量覆盖：

| 环境变量 | 用途 |
|----------|------|
| `LENS_DB_URL` | JDBC 地址 |
| `LENS_DB_USERNAME` / `LENS_DB_PASSWORD` | 数据库账号密码 |
| `LENS_REDIS_HOST` / `LENS_REDIS_PORT` / `LENS_REDIS_PASSWORD` | Redis 连接 |
| `LENS_JWT_SECRET` / `LENS_JWT_TTL_MS` | JWT 签名密钥与有效期（毫秒） |

### 看板邮件订阅

邮件订阅默认关闭。现有数据库先执行
`db/upgrade-20260910-dashboard-subscriptions.sql`，再为用户配置邮箱。部署机可安装 Playwright Chromium：

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

也可以在仓库根目录运行 `./verify.sh`，一次完成后端测试和全部前端检查。

## 参考

[Spring Boot](https://docs.spring.io/spring-boot/documentation.html)  
[MyBatis-Plus](https://baomidou.com/)  
[SpringDoc](https://springdoc.org/)  
