# Lens

数据集、卡片、看板设计，以及账号、角色、菜单。

. 配置数据集，设计卡片和看板  
. 按角色查看报表  
. 管理账号、角色、菜单  

## 目录

| 目录 | 说明 |
|------|------|
| `backend/` | 后端，见 [README](backend/README.md) |
| `frontend/` | 前端，见 [README](frontend/README.md) |

## 命令

```shell
# 建库后执行 backend/db/schema.sql；Redis 默认 127.0.0.1:6379 / Aa123456

cd backend && mvn -DskipTests spring-boot:run
cd frontend && pnpm i && pnpm dev
```
