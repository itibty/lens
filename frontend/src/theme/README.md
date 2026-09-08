# Lens 主题

- `tokens.ts` 是默认颜色、明暗表面和主题预设的来源。按用途修改语义，避免按页面新增颜色。
- `cssVars.ts` 一次性适配 `--na-*` 和 Element Plus 的 `--el-*`，在应用挂载前安装。
- 组件 CSS 使用 `var(--na-text-muted)`、`var(--na-surface-bg)` 等语义变量；继承 Element Plus 的组件也可使用对应 `--el-*`。
- 仪表盘在自己的容器上应用同一组变量。传送到 body 的弹层通过 `dashOverlayVars` 获得相同作用域，不修改根主题。
- 彩色预设统一由主色生成画布、`heading` 标题区和边框；卡片数据区保持中性，分类系列色保持稳定。主题辨识度在 `createTintedTheme` 集中调整。
- Canvas 使用主题对象里的实际颜色，通过图表/表格适配器传入，不向 Canvas 传 CSS 变量。
- 分类、连续、发散色板有各自含义，保留 `chartPalette.ts` 中的专用色板入口；默认分类色取公共 `DATA_SERIES`。
- 显式保存的自定义颜色优先于主题，不根据颜色相等猜测用户意图或重写历史配置。默认值继续在渲染时补齐。
- Sass 只保留布局、字体等编译期配置，颜色不再与 TypeScript 分别维护。

新增默认颜色应先检查已有语义。富文本用户色、语法高亮、分类色板、遮罩等有明确用途的颜色可以独立定义；不要机械合并数值相同但用途不同的颜色。

数字排版使用 `views/vis/shared/VisMetricValue.vue`（数字、单位、趋势符号）、`VisMetricAux.vue`（辅助标签与数值网格）和 `VisMetricRatio.vue`（当前值 / 目标值）。字号通过 `numberStyle.ts` / `numberFit.ts` 提供，避免各类卡片分别调整行高、单位间距和箭头位置。
