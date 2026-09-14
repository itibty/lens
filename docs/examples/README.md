# 演示数据与截图复现

[← 返回首页](../../README.zh-CN.md) · [入门指南](../getting-started.zh-CN.md) · [产品演示](../product.md)

这组示例用于 README 和产品演示，全部为生成的模拟数据，不包含真实客户或交易信息。

## 内容

| 内容 | 数量 / ID |
|------|-----------|
| 零售增长日表 | 5,520 行；数据集 `97101` |
| 渠道获客日表 | 460 行；数据集 `97102` |
| 获客转化漏斗 | 从获客日表展开；数据集 `97103` |
| 英文零售增长 | 复用零售日表，SQL 转换维度名称；数据集 `97104` |
| 图表卡片 | 28 张；中文 `97201`–`97219`，英文 `97301`–`97309` |
| 零售增长驾驶舱 | `97501` |
| 渠道增长与转化 | `97502` |
| Retail Growth Overview | `97503`；英文亮色版 |
| Retail Growth · Dark | `97504`；英文暗色版 |
| 产品演示分组 | `97601` |

数据覆盖 **2026-06-01 至 2026-08-31**，看板查询使用固定基准日 `2026-08-31` 展示 8 月数据，不依赖打开页面时的当前日期。零售日表按日期、区域、销售渠道和品类汇总；获客日表按日期和获客渠道汇总。

毛利率、平均客单价、转化率和获客成本均由查询公式计算。漏斗中的访问、注册、激活和付费阶段来自同一张获客日表，人数逐级递减；各日模拟人群独立，因此可以按日汇总。这里的获客成本仅计入示例投放费用。

英文数据集通过 `CASE` 表达式转换区域、渠道和品类名称，复用原始零售数据，不复制事实记录，也不做汇率换算。英文卡片以 CNY 标注人民币，`k` 表示千、`M` 表示百万。英文亮色和暗色看板复用同一组 9 张卡片，分别保存主题 `t1` 和 `t6`。英文内容来自数据集和卡片配置；应用菜单与操作提示仍沿用现有语言。

## 导入

先按[入门指南](../getting-started.zh-CN.md#本地开发)初始化 `lens` 数据库，再从仓库根目录执行：

```shell
mysql -h 127.0.0.1 -u root -p --default-character-set=utf8mb4 lens < backend/db/showcase.sql
```

这是可选演示数据包，不是增量迁移。它创建 `lens_demo_growth`、`lens_demo_acquisition` 两张独立数据表并添加数据集、卡片、看板和管理员角色的看板关联，不重建已有表。它不依赖旧示例的 `demo.sql`。

导入前确认数据源 `1` 指向该数据库、管理员角色 `1` 已存在，并且以上 ID 和两张示例表名尚未被使用。**同一数据库只导入一次，不要使用 `--force` 忽略错误**。重复导入会在表已存在时停止。更换数据库连接时，在 Lens 中调整数据源配置。

登录后，在报表中心的「产品演示」分组查看四个看板；在后台的数据集和卡片列表中可继续编辑。另有「区域经营明细」表格卡片 `97210`，可自行添加到看板。

## 重新生成数据包

从仓库根目录执行，使用 Python 标准库，无需安装依赖：

```shell
python3 docs/examples/generate_showcase.py
```

固定随机种子 `20260914`，输出到 `backend/db/showcase.sql`。此命令只生成文件，不连接或修改数据库。

## 更新截图

截图直接来自本地 Lens 页面。报表中心收起导航菜单后，可以完整查看示例网格。等待图表加载完成，关闭无关弹窗和提示，再捕获页面；数据集截图展示「绑定字段」对话框；不要改写页面文字或查询值。

| 文件 | 页面 |
|------|------|
| `docs/images/showcase-retail-growth.jpg` | `/vis/report/97501` |
| `docs/images/showcase-channel-growth.jpg` | `/vis/report/97502` |
| `docs/images/showcase-card-editor.jpg` | `/vis/cards/edit?id=97205` |
| `docs/images/showcase-dataset.jpg` | `/vis/datasets/edit?id=97101` |
| `docs/images/showcase-dashboard-designer.jpg` | `/vis/dashboards?id=97501` |
| `docs/images/showcase-english-overview.jpg` | `/vis/dashboards/view?id=97503`；1200 × 900 |
| `docs/images/showcase-english-dark.jpg` | `/vis/dashboards/view?id=97504`；1200 × 900 |
| `docs/images/showcase-mobile-overview.jpg` | `/vis/dashboards/view?id=97503`；390 × 844，顶部指标 |
| `docs/images/showcase-mobile-charts.jpg` | 同上，向下滚动至趋势图和渠道图表 |

移动端截图使用浏览器的手机尺寸视口，验证真实页面的响应式排列；不是手机设备实拍。独立预览不包含后台导航。截图后恢复临时视口尺寸。

图片引用位于根目录两个 README 和 `docs/product.md`。
