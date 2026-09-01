# Lens 前端

Vue 3 应用，覆盖数据集、卡片、看板设计，以及账号、角色、菜单管理。

. Vue 3.5 / Vite 8 / Pinia / Vue Router  
. Element Plus + UnoCSS  
. VChart / VTable  
. openapi 生成 Axios + TS 调用代码  
. 账号角色权限  

只用 pnpm，Node >= 20.12.1。

## 功能

- 数据集 SQL 编辑与字段绑定
- 卡片设计和看板布局
- 报表中心：按权限查看看板
- 用户、角色、菜单管理

## 目录

| 路径 | 说明 |
|------|------|
| `src/views/` | 页面：可视化、数据集、报表、权限、登录 |
| `src/apis/` | 接口客户端（`admin/`、`vis/` 均由 OpenAPI 生成，勿手改） |
| `src/stores/` | Pinia |
| `src/router/` | 路由 |
| `src/components/` | 通用组件 |
| `src/core/` | 请求封装和配置 |

## 命令

日常：

```shell
pnpm install          # 安装依赖
pnpm dev              # 开发  http://127.0.0.1:5173
pnpm build            # 类型检查 + 构建
```

检查：

```shell
pnpm type-check
pnpm lint
pnpm lint-fix
```

生成 API（需后端已启动）：

```shell
pnpm generate-api
```

依赖：

```shell
pnpm add [-D] lib@version
pnpm remove lib
pnpm outdated [--dev|--prod]   # 列出可升级
pnpm run check-upgrade         # 交互式升级
```

## 推荐插件

. Vue - Official（`vue.volar`）  
. ESLint（`dbaeumer.vscode-eslint`）  
. UnoCSS（`antfu.unocss`）  
. EditorConfig（`editorconfig.editorconfig`）  
. SVG（`jock.svg`）  
. indent-rainbow（`oderwat.indent-rainbow`）  
. Code Spell Checker（`streetsidesoftware.code-spell-checker`）  
. koroFileHeader（`obkoro1.korofileheader`）  

## 参考

[Vite 配置](https://cn.vitejs.dev/config/)  
[unocss 文档](https://unocss.dev/guide/)  
[unocss 规则查询](https://unocss.dev/interactive/)  
[iconify 图标](https://icon-sets.iconify.design/)  
[vueuse](https://vueuse.org/)  
[VChart](https://www.visactor.io/vchart)  
[VTable](https://www.visactor.io/vtable)  
[grid-layout-plus](https://grid-layout-plus.netlify.app/)  
['@umijs/openapi' 生成调用代码](https://www.npmjs.com/package/@umijs/openapi)  
[antfu/eslint-config](https://github.com/antfu/eslint-config)  
