# Lens 前端

Vue 3.5 + Vite 8 + Element Plus + Pinia。

约定见 [AGENTS.md](./AGENTS.md)。

## 运行

```bash
pnpm i
pnpm dev
```

- 地址：`http://127.0.0.1:5173`
- 开发代理：`/api` → `http://127.0.0.1:8080`（剥掉 `/api`）
- 需要后端已启动。账号 `admin` / `Aa123456`

只用 pnpm（`preinstall` 限制），Node >= 20.12.1。

## 页面

| 路由 | 说明 |
|------|------|
| `/login` | 登录 |
| `/vis/datasets` | 数据集（页面在 `views/ds`） |
| `/vis/cards` `/vis/cards/edit` | 卡片列表 / 设计 |
| `/vis/dashboards` `/vis/dashboards/edit` | 看板列表 / 设计 |
| `/vis/dashboards/view` | 看板预览（新窗口） |
| `/vis/report` `/vis/report/:id` | 报表中心 |
| `/sys/users` `/sys/roles` `/sys/menus` | 用户 / 角色 / 菜单 |
