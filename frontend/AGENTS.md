# Lens 前端 — Agent 约定

先读本文件和本仓库代码，再改行为。不要按其他后台模板的习惯发明交互。

## 技术栈

Vue 3.5 + TypeScript + Element Plus + UnoCSS + Pinia + Vue Router + Vite 8 + Axios。图表：VChart / VTable。

只用 pnpm。Node >= 20.12.1。

```bash
pnpm dev
pnpm build
pnpm type-check
pnpm lint / pnpm lint-fix
pnpm generate-api -- --service=vis   # 只重新生成 vis API；不要对 admin 跑 generate
```

没有测试框架。`pnpm build` 只做 type-check。

## 路径与自动引入

- `@/` → `./src/*`
- Vue / Router / Pinia / Element Plus / VueUse 由 unplugin 自动引入，不要手写这些 import
- `src/components/`、`src/layout/components/` 自动注册
- `src/views/**/components/` 要显式 import

弹窗用 `CustomDialog`，抽屉用 `CustomDrawer`。

## API

`src/apis/` 走 `@/core/request`。开发代理：`/api` → `VITE_SERVER`（默认 `http://127.0.0.1:8080`），剥掉 `/api`。请求头只带 `Authorization`（存 JWT 原文）。

| 目录 | 浏览器路径 | 说明 |
|------|------------|------|
| `src/apis/admin/` | `/api/auth` `/api/sys/*` | 账号、用户、角色、菜单。手写，勿 generate 覆盖 |
| `src/apis/vis/` | `/api/datasources` `/api/datasets` `/api/cards` `/api/dashboards` `/api/dash-groups` `/api/vis` | 可视化 |

后端路径没有 `/api` 前缀。

雪花 id 一律当字符串。分页的 `total` 等仍是数字。

## 环境

`.env.{mode}`：`dev` 的 `VITE_BASE_URL=/api`、`VITE_SERVER=http://127.0.0.1:8080`。构建注入 `__IS_BUILD__`、`__APP_VERSION__`。

## 路由

`src/router/index.ts`，布局在 `/`。无 `access_token` 去 `/login`。

| 路由 | 页面目录 |
|------|----------|
| `/vis/datasets` | `views/ds/` |
| `/vis/cards` `.../edit` | `views/vis/cards/` |
| `/vis/dashboards` `.../edit` | `views/vis/dashboards/` |
| `/vis/dashboards/view` | 看板预览（新窗口） |
| `/vis/report/:id` | `views/reports/` + `DashViewer` |
| `/sys/users` `/sys/roles` `/sys/menus` | `views/permission/` |

卡片 / 看板设计器的 `query_json` / `visual_json` / `config_json` 不要改，除非任务明确要求。

## 权限与侧栏

1. **系统菜单 + 功能点**（`sys_menu`）：角色只绑 FUNC。勾父级带子孙、半选、提交只存叶子 FUNC。`MENU` 不写 `perm_code`。
2. **报表中心**：虚拟根 `id=90`，不入库，每个登录用户都有。
3. **看板分组 + 角色绑看板**：侧栏报表中心下挂分组和已授权看板。admin 看全部启用看板。

`role_code=admin` 保存「配置功能 / 配置看板」会被后端拒绝，预期如此。

### 左侧菜单过滤

- 回车才搜（`MenuFilter` 上 `@keyup.enter`）
- 只过滤当前工作区：顶栏切工作区后，左侧只展示当前根的 `children`
- 切工作区会清空检索词
- 过滤用 `cloneMenuTree`，不要对 Vue proxy 做 `structuredClone`

## 两套分组

1. **报表分组** `vis_dash_group`：列表筛选、移组、编辑页「报表分组」、`DashGroupDrawer` 用 `DashGroupTreeSelect`。未分组 id 为 `'0'`。列表选中某分组查出该节点及子孙上的看板。分组管理在抽屉里（左树右看板），列表页不要加常驻左树。
2. **画布卡片分组**：设计器里把卡片打成一组（`dashLayout.ts` / `DashGroupTile` / `DashGroupEditor`），和报表分组无关。

## Store / 样式 / 指令

Pinia：`account` `app` `keepPage` `menu`。

UnoCSS Wind3，快捷类在 `uno.config.ts`。SCSS 变量 `src/assets/styles/variables.scss` 已注入，不要再 `@use`。

指令：`copy` `debounce` `throttle` `input-filter` `spinner` `watermark`。
