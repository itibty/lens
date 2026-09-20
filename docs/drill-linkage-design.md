# Lens 看板联动与下钻设计（仅设计，不实现）

日期：2026-09-11
状态：草案，待评审
范围：只读 SQL 数据集 → 卡片 → 看板查看态；不改数据集建模、不改权限模型。

## 1. 术语

* 明细下探：点图/表某格 → 看构成明细行。已上线。
* 联动：点 A 卡某维值 → 同看板 B 卡按该值过滤。未做，本案重点。
* 下钻：同卡内沿维度层级下探，如 年→月→日。未做，本案 V1 只做 filter 模式。

三者共用“点击取维值”能力，但查询通道必须分离，见 §3。

## 2. 现状（已逐行验证）

* 点击取维现成：
  * `frontend/src/views/vis/shared/VChartHost.vue:240` `handleClick` 仅 `interactive` 才发射 `markClick`，`217` `eventDatum` 经 `unwrapChartDatum` 取原始行。
  * `frontend/src/views/vis/shared/VisCardView.vue:403` `onMarkClick` 调 `contextFromChartDatum`，`407` 表格调 `contextFromTableRow`，`415` 透视调 `contextFromPivotPaths`，产物 `DetailHit{ filters: FilterItem[], metric, labels }`，逻辑在 `frontend/src/views/vis/shared/cardDetail.ts:60/107/150/167`，有单测 `cardDetail.test.ts:14`。
  * 注意：同环比字段点击返回 null（`cardDetail.ts:115`），联动须同样跳过。
* 明细通道已放行点击值：
  * `backend/.../vis/dto/query/DetailQueryRequest.java:30` `contextFilters`，`VisQueryPrep.java:113-126` 校验并包成 `FilterGroup(and)` 合并。
* 看板查数有安全边界，不可绕过：
  * `backend/.../vis/controller/VisQueryController.java:100` 注释：有看板+卡片 id 时只用库里 `query_json`，只收全局筛选。
  * `backend/.../vis/service/VisBoundQueryService.java:55` `bindData` 丢掉客户端 query，只用 `vis_card` 落库 + `copyAllowedGlobals`。
  * 白名单来自 `backend/.../vis/core/dash/VisDashFilters.java:68` `allowedForDataset(configJson.filters)`，按 `datasetId + applyAs + field` 对齐。
* 全局筛选链路已跑通：
  * `frontend/.../dashboards/dashFilterModel.ts:476` `globalsForCard` 按 `datasetId` 分发 → `DashViewer.vue:130` `globalsOf` → `QueryRequest.globalFilters/globalParams` → `VisQueryPrep.java:64-67` `mergeFilters`。
  * `VisQueryPrep.java:210` `mergeFilters` 就是追加一个 `FilterGroup(and)`，`197` `keepComplete` 做合法性过滤，加一路同理。
* 配置兼容性好：
  * `backend/.../vis/core/dash/VisDashWidgets.java:45` 只校验 `widgets`，`root` 原样回写，顶层加 `links` 不会炸。
  * `VisBoundQueryService.java:46` `FAIL_ON_UNKNOWN_PROPERTIES=false`，老数据缺字段默认关闭。
* 字段校验有现货：
  * `backend/.../vis/service/VisDatasetService.java:82` `loadReady()` 返回 `fields: List<ConfSqlFieldInfo>`，可校验目标字段存在。
* 两个已确认的坑（V1 必须改）：
  * `prepare()` 不合 `contextFilters`，只有 `prepareDetail` 合（`VisQueryPrep.java:45-70` vs `119-126`）。下钻 filter 模式也必须加后端字段，不是零改动。
  * `interactive` 绑死明细：`VisCardView.vue:648-732` 8 处 `:interactive="allowDetail"`，`302` `openMenu` 无 `allowDetail` 直接 return。联动必须解耦为 `:interactive="allowDetail || linkageClickable"` 并新增 emit，不能复用明细菜单。

## 3. 总体方案：三通道分离

* `globalFilters/globalParams`：人填的顶栏筛选，走现有 `configJson.filters` 白名单。
* `linkageFilters`：点出来的联动/下钻值，新加，与全局独立合并、独立清除，不进顶栏。
* `contextFilters`：明细专用，保持不动。

为什么不复用 globals：会污染 filterBar UX，且联动需支持跨数据集字段名映射（如 A.region → B.province），globals 要求同 datasetId 同 field，对不上。

## 4. 数据模型

### 4.1 看板 `configJson.links`（新增顶层数组）

```json
{
  "widgets": [...],
  "filters": [...],
  "links": [
    {"id":"l1","sourceCardId":11,"sourceField":"region","targetCardId":22,"targetField":"region","op":"in","enabled":true}
  ]
}
```

* `sourceField` 为源卡维度 `field`（非 alias），`targetField` 为目标卡数据集字段。
* `op` 仅允许 `eq/in/is_null`，V1 不做 `between/like`。
* `timeGrain` 透传（如年月日粒度）。
* 缺省无 `links` = 功能关闭；`enabled:false` = 单条关闭。

### 4.2 卡片 `visual.drill`（V1 极简）

```json
{"chartType":"bar","drill":{"enabled":true}}
```

* V1 约定 `query.dimensions` 顺序即层级，点击第 i 个维带上前 i 个值做 filter，不换 dimensions。
* V2 再议 replace 模式（换维），需放行 `drillDimensions`，风险大，本案不做。

### 4.3 查询 DTO（后端新增，前端 regen）

* `QueryRequest` 加 `linkageFilters: List<FilterItem>`，`PivotQueryRequest` 同样加。
* `DetailQueryRequest.contextFilters` 不动。
* 加完跑 `frontend: pnpm generate-api`，否则 `vis-compat` 类型对不上。

## 5. 后端设计

新增 `VisDashLinks`（对标 `VisDashFilters`）：

* `parseLinks(configJson): List<Link>`：容错解析，非法条目丢弃并记 warn，不抛错（避免老数据打不开看板）。
* `resolveTargetFilters(dash, sourceCardId, sourceHit, targetDatasetId): List<FilterItem>`：按 `links` 找 `sourceCardId+sourceField` 命中，用 hit 值生成目标 `FilterItem{field: targetField, op, value}`，`null` 转 `is_null`。

`VisBoundQueryService.bindData/bindPivot` 新增 `copyAllowedLinkage`：

1. `requireBoundCard` 已保证源/目标同看板、未删、可见，否则抛错（复用）。
2. 校验每条 `linkageFilters` 都有对应 `links` 配置且 `enabled`，无配置一律丢弃（不是抛错，避免前端版本超前刷屏）。
3. 校验 `targetField` 在 `VisDatasetService.loadReady(targetDatasetId).fields` 中存在，否则丢弃。
4. 校验 `op` 在白名单、`value` 非空（`is_null` 除外）、`timeGrain` 合法（复用 `applyContextGrain` 逻辑）。
5. 通过的包成独立 `FilterGroup(and)` 交给 `VisQueryPrep.prepare/preparePivot` 合并，复用 `keepComplete/isCompleteFilter`。

`VisQueryPrep` 改动各 5 行：在 `mergeFilters` 后再合一路 linkage，不改现有 globals 语义。

导出 `exportCardData` 复用 `bindData`，联动值默认带入导出，保持所见即所得。如产品否决，则导出入口显式清空 linkage。

静态卡（`richtext/url`）无数据集，不参与联动源/目标；`number/progress` 无维度（`VisQueryPrep:252` 强制 0 维）只能做目标。

## 6. 前端设计

状态（`DashViewer` 持有，provide/inject）：

```ts
linkage = { sourceCardId?: string, hit?: DetailHit, byTarget: Record<targetCardId, FilterItem[]> }
```

* `VisCardView` 新增 `linkageClickable` prop + `linkageClick(hit)` emit，`interactive` 改为 `allowDetail || linkageClickable`。点击菜单加 `联动筛选` 项，与 `查看明细` 并列，不复用 `openMenu` 的 allowDetail 门控。
* `DashViewer.globalsOf` 旁新增 `linkageOf(card)`，经 `links` 映射后传给查询 hook（现有 `useDashRefresh` 的 `refreshTick` 机制复用，值变即重查）。
* 交互：点源高亮，再点取消；被联动卡角标 `联动：华东` + 顶栏一键 `清除联动`；空值显示 `为空`。
* 截图/订阅走无联动默认，避免 `subscriptionScreenshot` 误判 loading/error。
* 下钻 V1 = 到自己的联动：`byTarget[self]=hit.filters` + 面包屑 `全部 > 2024 > 1月`，返回即 pop，无需后端特殊分支。

## 7. 安全与权限

* 不打破 `bindData` 边界：客户端 query 仍丢弃，只收受限的 linkage。
* 越权面：A 看不到的字段不能经联动带入 B。用目标数据集字段存在性 + link 配置存在性双重 gate；`dashboardAccess.assertCanView` 已在 `requireBoundCard` 前执行。
* SQL 注入：`FilterItem.value` 全走参数化（`SqlBuilder` 现状），`field` 只接受白名单字段，不拼原始字符串。

## 8. 兼容与迁移

* 老看板无 `links`、老卡片无 `drill`：解析为关闭，读写兼容。
* 前后端版本错位：前端多发 linkage 给老后端 → Jackson 未知属性？后端 DTO 加字段后老前端少发 → null 即无联动，均安全。发版顺序建议后端先上。
* 订阅截图、报表分享链接不带 linkage，避免状态外泄。

## 9. 测试策略

后端单测（`VisBoundQueryServiceTest` 旁新增）：非法 link 丢弃、跨看板拒绝、未知目标字段丢弃、非法 op 丢弃、`is_null` 放行、透视双通道一致。

前端单测：`globalsForCard` 不变 + `linkageOf` 合并、清除、跨数据集映射、同环比点击不触发。

人工验收（仿 `docs/testing/2026-09-10-dashboard-email-subscriptions-manual-todo.md`）：点 A→B 变、再点取消、一键清除、禁用目标卡、源为静态卡无反应、截图不带联动、导出带联动、刷新后联动保留与否（建议不保留）。

`verify.sh` 跑 `mvn test + pnpm lint/type-check/test` 全绿只是门槛，不保证逻辑正确，联动必须走上述人工单。

## 10. 分期

* P1（MVP）：同数据集 `eq/in` 单向联动 + 清除 + 后端白名单 + 前端 chip。约后端 3 文件（DTO、VisDashLinks、BoundQuery+Prep），前端 3 文件（Viewer 状态、CardView 交互、查询拼装）。
* P2：下钻 filter（到自己）+ 面包屑 + 跨数据集字段映射。
* P3：下钻 replace 换维、联动高亮回显、多源叠加冲突规则。

## 11. 未决问题

* 联动值是否进 URL（分享可复现）？建议 V1 不进。
* 多源同时联动同一目标是覆盖还是交集？建议 V1 后点覆盖前值，避免空结果难排错。
* 联动是否参与订阅截图？建议 V1 不参与。
