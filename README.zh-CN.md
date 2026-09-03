# Lens

[English](README.md) | [中文](README.zh-CN.md)

Lens 是一个轻量 BI 平台，用于配置数据集、设计卡片和看板，并按角色向业务用户发布报表。

产品说明见 [docs/product.md](docs/product.md)。

## 功能

- 连接数据源，通过只读 SQL 定义数据集
- 设计图表、表格、指标卡等卡片
- 使用布局、分组和全局筛选组装看板
- 按角色查看授权报表
- 管理账号、角色、菜单和权限

## 仓库结构

| 路径 | 说明 |
|------|------|
| `backend/` | JDK 21 + Spring Boot 4.1 服务端，详见 [backend/README.md](backend/README.md) |
| `frontend/` | Vue 3 + Vite Web 应用，详见 [frontend/README.md](frontend/README.md) |

## 环境要求

- JDK 21、Maven >= 3.6.3
- Node.js >= 20.12.1、pnpm 10.5.0（项目不支持 npm/yarn）
- MySQL，数据库名 `lens`
- Redis（本地默认 `127.0.0.1:6379`，密码 `Aa123456`）

## 本地开发

创建 `lens` 数据库并执行 `backend/db/schema.sql`；如需演示数据，再执行 `backend/db/demo.sql`。

```shell
cd backend && mvn -DskipTests spring-boot:run
cd frontend && pnpm install && pnpm dev
```

本地 MySQL 默认账号密码为 `root` / `Aa123456`。这些默认值仅用于开发环境；部署时可通过以下环境变量覆盖：

| 环境变量 | 用途 |
|----------|------|
| `LENS_DB_URL` | JDBC 地址 |
| `LENS_DB_USERNAME` / `LENS_DB_PASSWORD` | 数据库账号密码 |
| `LENS_REDIS_HOST` / `LENS_REDIS_PORT` / `LENS_REDIS_PASSWORD` | Redis 连接 |
| `LENS_JWT_SECRET` / `LENS_JWT_TTL_MS` | JWT 签名密钥与有效期 |

开发地址：

- 前端：`http://127.0.0.1:5173`
- Swagger：`http://127.0.0.1:8080/swagger-ui.html`

## 构建和运行

```shell
./build.sh           # 构建全部
./build.sh frontend  # 仅前端
./build.sh backend   # 仅后端

./app.sh start
./app.sh status
./app.sh restart
./app.sh stop
```

打包应用位于 `app/`，启动后访问 `http://127.0.0.1:8080`。

## 验证修改

安装依赖后，在仓库根目录运行：

```shell
./verify.sh
```

它会依次运行后端测试、前端 lint、类型检查和前端测试，不会重新生成 API 客户端。

## License

Copyright 2026 tibty.

使用 [Apache License 2.0](LICENSE) 许可。
