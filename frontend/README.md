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

以下 `pnpm` 命令均在 `frontend/` 目录执行；从仓库根目录开始时先运行：

```shell
cd frontend
pnpm install
```

安装依赖时会自动执行 `preinstall`，检查是否使用 pnpm，无需手动运行该脚本。

### 开发、构建与预览

| 命令 | 用途 | 输出或行为 |
|------|------|------------|
| `pnpm dev` | 本地开发 | 使用 `dev` 模式，启动开发服务器并打开浏览器，默认地址为 `http://127.0.0.1:5173` |
| `pnpm build` | 常规生产构建 | 并行执行类型检查和生产打包；任一失败则命令失败，产物位于 `dist/` |
| `pnpm build-only` | 仅生产打包 | 使用 `prd` 模式，跳过类型检查；也是 `build` 调用的内部脚本 |
| `pnpm build:analyze` | 排查大文件 | 执行完整 `build`，并额外生成 `pkg-stats.html` 体积报告 |
| `pnpm preview` | 本地检查打包结果 | 启动 `dist/` 预览服务，不会自动构建；具体地址以终端输出为准 |

日常构建使用 `pnpm build`。只有已单独完成类型检查、需要重复打包时，才使用 `pnpm build-only`。

检查生产产物的常用流程：

```shell
pnpm build
pnpm preview
```

排查包体积时运行 `pnpm build:analyze`，然后用浏览器打开前端目录下的 `pkg-stats.html`。普通构建不会更新该报告；已有报告可能对应之前的产物。

### 代码检查与测试

```shell
pnpm type-check       # 只检查 TypeScript / Vue 类型，不生成构建产物
pnpm lint             # 检查代码规范，不修改文件
pnpm lint --fix       # 自动修复可修复的问题，其余问题需要手动处理
pnpm test             # 运行全部测试一次，适合提交前或 CI 检查
pnpm test:watch       # 监听文件变化并重跑测试，适合开发调试；Ctrl+C 退出
```

只运行一个测试文件：

```shell
pnpm test src/views/vis/charts/catalog.test.ts
```

在仓库根目录运行 `./verify.sh` 可一次完成后端测试、前端 lint、类型检查和前端测试。

### 生成 API 客户端

先启动后端，确保 `http://127.0.0.1:8080/v3/api-docs/admin` 和 `/v3/api-docs/vis` 可访问，再按需要运行：

```shell
pnpm generate-api                       # 默认生成 admin 和 vis 两组
pnpm generate-api --service=admin       # 只生成管理端 API
pnpm generate-api --service=vis         # 只生成可视化 API
pnpm generate-api --service=admin,vis   # 显式指定两组，与默认行为相同
```

生成结果写入 `src/apis/admin/` 和 `src/apis/vis/`，指定单组时仅更新对应目录。不要手动编辑生成文件；接口变更后重新生成，再执行 `pnpm type-check` 检查调用处。

### 已合并的命令

参数直接放在脚本名后即可，无需额外添加 `--` 分隔符。

| 已删除的命令 | 现在的用法 |
|--------------|------------|
| `pnpm lint-fix` | `pnpm lint --fix` |
| `pnpm generate-api:vis` | `pnpm generate-api --service=vis` |

`build-only` 被 `build` 调用；`build:analyze` 会额外生成报告；`test:watch` 会持续监听。这些脚本用途不同，仍然保留。

### 依赖管理

```shell
pnpm add axios              # 添加生产依赖；指定版本时使用 包名@版本号
pnpm add -D typescript      # 添加开发依赖
pnpm remove 包名            # 删除依赖
pnpm outdated              # 查看可升级的依赖，不修改版本
pnpm run check-upgrade     # 交互式选择升级依赖
```

`check-upgrade` 排除了 `sass`、`typescript` 和 `@visactor/*`，这些依赖需单独评估兼容性后升级。

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

## 构建体积

Vite 8 使用 Rolldown 的 `output.codeSplitting`，按图表渲染器、图表、表格、代码编辑器、SQL 格式化、富文本和 UI 库分组。`entriesAware` 按入口实际引用保留懒加载边界，其余依赖自动分包，避免把所有第三方库合成首页必须下载的公共包。VChart / VTable 的 vrender 去重配置必须保留。

分组的 `maxSize: 800_000` 是压缩前模块大小的拆分目标，最终产物仍保留 500 kB 告警。ExcelJS 上游提供单体 bundle，无法靠分包配置进一步拆开，单独输出为 `vendor-excel`；后续缩减它需要调整导出依赖或导出流程，不要直接调高告警阈值。

运行 `pnpm build:analyze` 后打开 `pkg-stats.html` 查看模块占比；普通构建不生成该报告。`dist/.vite/manifest.json` 记录入口、静态导入和动态导入，可递归统计首页依赖，避免只关注最大文件而忽略首页总下载量。

构建保留 `.br` 预压缩文件。部署服务器需按 `Accept-Encoding` 协商返回，并设置 `Content-Encoding: br` 和 `Vary: Accept-Encoding` 才能节省传输量。HTML 和 `version.json` 应及时刷新，带 hash 的 JS/CSS 可设置长期缓存。
