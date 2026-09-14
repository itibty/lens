# 开始使用 Lens

[← 返回首页](../README.zh-CN.md) · [English](getting-started.md) · [产品演示](product.md)

在本地启动 Lens，导入示例看板，并构建可运行的打包应用。

[环境要求](#环境要求) · [本地开发](#本地开发) · [构建和运行](#构建和运行) · [验证修改](#验证修改)

## 环境要求

- JDK 21、Maven >= 3.6.3
- Node.js >= 20.12.1、pnpm 10.5.0（项目不支持 npm/yarn）
- MySQL，数据库名 `lens`
- Redis（本地默认 `127.0.0.1:6379`，密码 `Aa123456`）

## 本地开发

创建 `lens` 数据库并执行 `backend/db/schema.sql`，导入当前应用表结构和数据快照，包括账号、权限、数据集、卡片、看板及订阅。需要查询示例看板时，再执行 `backend/db/demo.sql`，它仅包含示例订单表的结构和数据。

**两个脚本分别重建各自的表，请使用新的开发数据库，不要对需要保留的数据重复执行。** 项目不维护增量变更脚本。

要体验[产品演示](product.md)中的看板，在 `schema.sql` 之后额外导入一次 `backend/db/showcase.sql`。它添加独立的示例表和配置，不依赖 `demo.sql`，具体前提与命令见[导入说明](examples/README.md#导入)。

从仓库根目录打开终端，启动后端：

```shell
cd backend
mvn -DskipTests spring-boot:run
```

再从仓库根目录打开另一个终端，启动前端：

```shell
cd frontend
pnpm install
pnpm dev
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

从仓库根目录执行，构建脚本会检查环境并生成打包应用：

```shell
./build.sh           # 构建全部
./build.sh frontend  # 仅前端
./build.sh backend   # 仅后端

./app.sh start
./app.sh status
./app.sh restart
./app.sh stop
```

打包应用位于 `app/`，启动后访问 `http://127.0.0.1:8080`，日志位于 `app/server/lens-server.log`。

## 验证修改

安装依赖后，在仓库根目录运行：

```shell
./verify.sh
```

它会依次运行后端测试、前端 lint、类型检查和前端测试，不会重新生成 API 客户端。

## 继续阅读

- [演示数据](examples/README.md)：导入首页中的看板、重新生成数据与更新截图。
- [后端开发](../backend/README.md)：服务配置、接口、订阅与测试。
- [前端开发](../frontend/README.md)：应用结构、开发命令与 API 生成。
