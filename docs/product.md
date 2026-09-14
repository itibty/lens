# Lens · Product gallery

[← Lens](../README.md) · [中文首页](../README.zh-CN.md) · [Get started](getting-started.md)

Review sales, compare product categories, and evaluate acquisition channels. These examples show the business questions you can explore in Lens, followed by the steps to build your own dashboards.

Every screenshot comes from a working Lens page using **synthetic demo data**.

| What do you want to understand? | Explore |
|---------------------------------|---------|
| How are revenue and profitability tracking? | [Sales overview](#retail-growth) |
| Which product categories contribute the most revenue? | [Product performance](#product-performance) |
| Which channels bring paying users at a lower acquisition cost? | [Channel analysis](#channel-growth-and-conversion) |

## Retail growth

**How is the business performing, and where is revenue coming from?**

A sales review that brings revenue, orders, gross margin, and average order value together with the breakdowns behind them.

![Retail growth dashboard](images/showcase-retail-growth.jpg)

Start with the four headline metrics, compare daily revenue with gross profit, then check sales-channel contribution and regional rankings to see where to investigate further.

### Product performance

**Which categories make up the sales mix?**

In the same retail dashboard, the category bar chart ranks revenue and the treemap shows each category's contribution. Use both to see whether sales are concentrated in a few categories. With detail viewing enabled, select a category to inspect its underlying daily records.

The sample dataset also contains orders and gross profit, so you can build additional cards to compare category order volume or margin using the same data.

## Channel growth and conversion

**Which channels bring paying users efficiently, and where do visitors drop out?**

An acquisition review combining visitor and paid-user counts, conversion rate, acquisition cost, and the visit → signup → activation → payment funnel.

![Channel growth and conversion dashboard](images/showcase-channel-growth.jpg)

- Follow the funnel to identify the stages with the largest drop-offs.
- Compare channels by paid-user contribution and acquisition cost, then use the detail table to check volume and conversion together.
- Use the daily paid-user trend to see how each channel changes over the month.

[Run Lens](getting-started.md) and [import the example dashboards](examples/README.md#导入) to explore these views yourself.

## Build your own

SQL → Dataset → Card → Dashboard. The examples above use the same editors available for your own data.

### Define the dataset

Run a read-only SQL query, inspect its output, and bind fields as dimensions or metrics. The retail example uses business date, region, channel, and category as dimensions, with orders, revenue, and profit as metrics.

![Retail dataset field binding](images/showcase-dataset.jpg)

### Build the cards

Choose a dataset and chart type, then drag dimensions and metrics into place. Here, the retail dataset supplies a daily revenue and gross-profit trend, filtered to August 2026. The preview is a real query result.

![Card editor with retail data and trend preview](images/showcase-card-editor.jpg)

### Arrange the dashboard

Resize and position cards on a grid. The retail example combines KPI cards, a line chart, a donut chart, a bar chart, a ranking, and a treemap. The same saved cards appear in the report center.

![Retail dashboard in the visual designer](images/showcase-dashboard-designer.jpg)

### Filter and inspect

Use dashboard filters to narrow the analysis across configured cards. When detail viewing is enabled, click a chart data point to inspect its underlying records; the detail query retains the card and dashboard filters along with the selected dimension values.

## Viewing options

The retail report is also available with English labels, a dark theme, and a mobile layout.

### English dashboard content

The same retail data with English titles, legends, and category labels. Amounts remain in CNY; `k` means thousands and `M` means millions.

![Standalone English retail growth dashboard](images/showcase-english-overview.jpg)

### Dark theme

The same retail cards in a saved dark dashboard, shown in the standalone viewer.

![Standalone English retail dashboard in the dark theme](images/showcase-english-dark.jpg)

### Mobile portrait view

Cards stack vertically on narrow screens. Check headline metrics first, then scroll into trends and channel analysis. These captures use a **390 × 844** browser viewport.

<table>
  <tr><th>Headline metrics</th><th>Charts while scrolling</th></tr>
  <tr>
    <td><img src="images/showcase-mobile-overview.jpg" alt="Mobile English dashboard metrics" width="300"></td>
    <td><img src="images/showcase-mobile-charts.jpg" alt="Mobile revenue trend and channel chart" width="300"></td>
  </tr>
</table>

## Try these examples

Follow the [getting started guide](getting-started.md) to run Lens, then use the [showcase import instructions](examples/README.md#导入) to load these dashboards. The example pack includes **4 datasets, 28 cards, and 4 dashboards**; its data definitions and screenshot reproduction steps live in the [showcase documentation](examples/README.md).

In Lens, open **报表中心 → 产品演示** to find **零售增长驾驶舱**, **渠道增长与转化**, **Retail Growth Overview**, and **Retail Growth · Dark**. The datasets and all 28 cards remain editable in the administration workspace.
