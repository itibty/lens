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

也可以在仓库根目录运行 `./verify.sh`，一次完成后端测试和全部前端检查。

## 参考

[Spring Boot](https://docs.spring.io/spring-boot/documentation.html)  
[MyBatis-Plus](https://baomidou.com/)  
[SpringDoc](https://springdoc.org/)  
