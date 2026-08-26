# Lens

看板、卡片、只读数据集，以及账号、角色、菜单。

改代码前先读各目录的 `AGENTS.md`。

## 目录

| 目录 | 说明 | 文档 |
|------|------|------|
| `backend/` | JDK 21 + Spring Boot 4.1 | [README](backend/README.md) · [AGENTS](backend/AGENTS.md) |
| `frontend/` | Vue 3 设计器 | [README](frontend/README.md) · [AGENTS](frontend/AGENTS.md) |

## 启动

```bash
# 建库 lens 后执行 backend/db/schema.sql；可选 demo.sql
export JAVA_HOME=$HOME/tools/java/openjdk21.50.19/Home
cd backend && mvn -DskipTests spring-boot:run   # http://127.0.0.1:8080

cd frontend && pnpm i && pnpm dev               # http://127.0.0.1:5173
```

账号 `admin` / `Aa123456`。前端开发时代理 `/api` 到后端；后端路径本身没有 `/api`。
