# Lens

[English](README.md) | [中文](README.zh-CN.md)

Lens 是一套轻量 BI 平台，用来配置数据集、设计卡片和看板，并按角色把报表开放给业务用户。

带截图的功能说明见 [docs/product.md](docs/product.md)。

## 功能

- 连接数据源，用 SQL 定义只读数据集
- 设计卡片（图表、表格、KPI 等）
- 把卡片拼成看板，支持分组、布局和全局筛选
- 按角色查看已授权的看板
- 管理账号、角色、菜单和权限

## 目录

| 路径 | 说明 |
|------|------|
| `backend/` | 后端服务，见 [backend/README.md](backend/README.md) |
| `frontend/` | 前端应用，见 [frontend/README.md](frontend/README.md) |

## 本地运行

需要本机 MySQL（库名 `lens`）和 Redis。建库后执行 `backend/db/schema.sql`，可选执行 `backend/db/demo.sql`。

```shell
cd backend && mvn -DskipTests spring-boot:run
cd frontend && pnpm i && pnpm dev
```

Redis 默认 `127.0.0.1:6379`，密码 `Aa123456`。

## 构建与运行

`build.sh` 用于校验构建环境、构建前后端，并生成 `app/` 部署目录：

```shell
./build.sh           # 构建全部
./build.sh frontend  # 仅构建前端
./build.sh backend   # 仅构建后端
```

`app.sh` 用于管理构建后的应用：

```shell
./app.sh start
./app.sh status
./app.sh restart
./app.sh stop
```

启动后访问 `http://127.0.0.1:8080`，日志位于 `app/server/lens-server.log`。

## 开源许可

Copyright 2026 tibty。

本项目基于 [Apache License 2.0](LICENSE) 开源。
