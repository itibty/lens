# Lens

Lens 是一套轻量 BI 平台，用来配置数据集、设计卡片和看板，并按角色把报表开放给业务用户。

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
| `AGENTS.md` | 给开发代理用的项目说明 |

## 本地运行

需要本机 MySQL（库名 `lens`）和 Redis。建库后执行 `backend/db/schema.sql`，可选执行 `backend/db/demo.sql`。

```shell
cd backend && mvn -DskipTests spring-boot:run
cd frontend && pnpm i && pnpm dev
```

默认账号 `admin` / `Aa123456`。Redis 默认 `127.0.0.1:6379`，密码 `Aa123456`。
