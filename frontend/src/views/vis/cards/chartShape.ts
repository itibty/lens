import type { DatasetField, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { getChartCatalogEntry } from '@/views/vis/charts/catalog'
import { incompleteFilterMessage } from '@/views/vis/shared/filterValue'
import { hasKpiTarget } from '@/views/vis/shared/kpiCard'
import { hasProgressTarget } from '@/views/vis/shared/progressCard'
import { staticContentError } from '@/views/vis/shared/staticCard'
import { isDateField, isStaticChart, regularMetrics } from '@/views/vis/shared/types'

function chartTypeOf(chartType?: string) {
  return String(chartType || 'table').toLowerCase()
}

/** 表格、指标卡可配同比/环比；其余图会在切换时清掉 */
export function allowContrastForChart(chartType?: string) {
  return getChartCatalogEntry(chartType)?.allowContrast ?? false
}

export function listChartConstraints(chartType?: string): string[] {
  return [...(getChartCatalogEntry(chartType)?.constraints ?? ['请至少添加维度或指标'])]
}

export type QueryShelf = 'dataset' | 'dimensions' | 'rowDimensions' | 'colDimensions' | 'metrics' | 'filters' | 'having' | 'content'

export interface QueryIssue {
  message: string
  shelf: QueryShelf
  uid?: string
}

function pillUid(item: { _uid?: string } | undefined) {
  return item?._uid
}

function issue(shelf: QueryShelf, message: string, uid?: string): QueryIssue {
  return uid ? { message, shelf, uid } : { message, shelf }
}

function markExtras(issues: QueryIssue[], shelf: QueryShelf, message: string, extras: Array<{ _uid?: string }>) {
  issues.push(issue(shelf, message))
  for (const item of extras) {
    const uid = pillUid(item)
    if (uid)
      issues.push(issue(shelf, message, uid))
  }
}

function contrastFieldMessage(metric: VIS.MetricItem): string | null {
  const contrast = metric.contrast
  if (!contrast)
    return null
  if (!metric.label?.trim())
    return '对比指标需要填写显示名'
  if (!contrast.timeField)
    return '对比指标需要选择日期字段'
  if (!contrast.calcMethod)
    return '对比指标需要选择对比方式'
  if (!contrast.calcType)
    return '对比指标需要选择结果列'
  if (!contrast.valueExp)
    return '对比指标需要选择评估期'
  return null
}

function pushContrastFieldIssues(issues: QueryIssue[], metrics: VIS.MetricItem[]) {
  for (const metric of metrics) {
    const message = contrastFieldMessage(metric)
    if (message)
      issues.push(issue('metrics', message, pillUid(metric as { _uid?: string })))
  }
}

function pushBannedContrast(issues: QueryIssue[], metrics: VIS.MetricItem[], message: string) {
  markExtras(issues, 'metrics', message, metrics as Array<{ _uid?: string }>)
}

function isDateDimension(dim: VIS.DimensionItem, fields?: DatasetField[]) {
  if (dim.timeGrain)
    return true
  const dataType = fields?.find(item => item.field === dim.field)?.dataType
  return isDateField(dataType) || dataType === 'timestamp'
}

/** 设计器禁止日期维 + 同环比；后端不拒，接口/旧 JSON 仍可能带上。 */
function pushDateDimContrastConflict(
  issues: QueryIssue[],
  dims: VIS.DimensionItem[],
  contrastMetrics: VIS.MetricItem[],
  fields?: DatasetField[],
) {
  if (!contrastMetrics.length)
    return
  const dateDims = dims.filter(dim => isDateDimension(dim, fields))
  if (!dateDims.length)
    return
  const message = '当前有日期维度，指标中不可配置同环比'
  markExtras(issues, 'metrics', message, contrastMetrics as Array<{ _uid?: string }>)
  markExtras(issues, 'dimensions', message, dateDims as Array<{ _uid?: string }>)
}

function pushFilterLikeIssues(
  issues: QueryIssue[],
  shelf: QueryShelf,
  items: Array<{ _uid?: string, op?: VIS.FilterItem['op'], valueExp?: VIS.FilterItem['valueExp'], value?: unknown }>,
) {
  const incomplete = items
    .map(item => ({ item, message: incompleteFilterMessage(item) }))
    .filter((entry): entry is { item: typeof items[number], message: string } => !!entry.message)
  if (!incomplete.length)
    return
  issues.push(issue(shelf, incomplete[0].message))
  for (const entry of incomplete) {
    const uid = pillUid(entry.item)
    if (uid)
      issues.push(issue(shelf, entry.message, uid))
  }
}

function pushQueryFilterIssues(issues: QueryIssue[], query: VisQueryConfig) {
  const filters = (query.filters ?? []).flatMap(group => group.conditions ?? [])
  pushFilterLikeIssues(issues, 'filters', filters as Array<{ _uid?: string }>)
  pushFilterLikeIssues(issues, 'having', (query.havingFilters ?? []) as Array<{ _uid?: string }>)
}

/** 刷新 / 保存时收集形状问题；带 uid 的落点对应胶囊，无 uid 的落在投放区 */
export function collectQueryIssues(
  chartType: string,
  query: VisQueryConfig,
  fields?: DatasetField[],
  visual?: VisVisualConfig,
): QueryIssue[] {
  const issues: QueryIssue[] = []
  const type = chartTypeOf(chartType)

  if (isStaticChart(type)) {
    const message = staticContentError(type, visual)
    if (message)
      issues.push(issue('content', message))
    return issues
  }

  if (!query.datasetId)
    issues.push(issue('dataset', '请选择数据集'))

  const dims = query.dimensions ?? []
  const metrics = query.metrics ?? []
  const regulars = regularMetrics(metrics)
  const contrastMetrics = metrics.filter(metric => metric.contrast)
  const cardinality = getChartCatalogEntry(type)?.cardinality ?? {
    dimensions: { min: 0 },
    metrics: { min: 0 },
  }

  if (type === 'pivot') {
    if (metrics.length < cardinality.metrics.min)
      issues.push(issue('metrics', '透视表至少需要 1 个指标'))
    const rowFields = new Set((query.rowDimensions ?? []).map(d => d.field))
    const dupCols = (query.colDimensions ?? []).filter(dim => rowFields.has(dim.field))
    if (dupCols.length)
      markExtras(issues, 'colDimensions', '行维和列维不能使用同一字段', dupCols as Array<{ _uid?: string }>)
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, '透视表不支持同比 / 环比')
    else
      pushContrastFieldIssues(issues, metrics)
  }
  else if (type === 'number') {
    if (dims.length > (cardinality.dimensions.max ?? Number.POSITIVE_INFINITY))
      issues.push(issue('dimensions', '指标卡不支持维度'))
    if (regulars.length < cardinality.metrics.min)
      issues.push(issue('metrics', '指标卡至少需要 1 个主指标（未开同比 / 环比）'))
    pushContrastFieldIssues(issues, metrics)
  }
  else if (type === 'progress') {
    if (dims.length > (cardinality.dimensions.max ?? Number.POSITIVE_INFINITY))
      issues.push(issue('dimensions', '进度条不支持维度'))
    if (regulars.length < cardinality.metrics.min)
      issues.push(issue('metrics', '进度条至少需要 1 个指标'))
    if (regulars.length > (cardinality.metrics.max ?? Number.POSITIVE_INFINITY))
      markExtras(issues, 'metrics', '进度条最多 2 个指标', regulars.slice(cardinality.metrics.max) as Array<{ _uid?: string }>)
    if (regulars.length >= cardinality.metrics.min
      && regulars.length <= (cardinality.metrics.max ?? Number.POSITIVE_INFINITY)
      && !hasProgressTarget(query, visual)) {
      issues.push(issue('metrics', '请在指标区添加第 2 个指标，或到功能设置填写固定目标'))
    }
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, '进度条不支持同比 / 环比')
  }
  else if (type === 'kpi') {
    if (dims.length < cardinality.dimensions.min)
      issues.push(issue('dimensions', 'KPI图需要恰好 1 个维度'))
    else if (dims.length > (cardinality.dimensions.max ?? Number.POSITIVE_INFINITY))
      markExtras(issues, 'dimensions', 'KPI图需要恰好 1 个维度', dims.slice(cardinality.dimensions.max) as Array<{ _uid?: string }>)
    if (regulars.length < cardinality.metrics.min)
      issues.push(issue('metrics', 'KPI图至少需要 1 个指标'))
    if (regulars.length > (cardinality.metrics.max ?? Number.POSITIVE_INFINITY))
      markExtras(issues, 'metrics', 'KPI图最多 2 个指标', regulars.slice(cardinality.metrics.max) as Array<{ _uid?: string }>)
    if (dims.length === cardinality.dimensions.min
      && regulars.length >= cardinality.metrics.min
      && regulars.length <= (cardinality.metrics.max ?? Number.POSITIVE_INFINITY)
      && !hasKpiTarget(query, visual)) {
      issues.push(issue('metrics', '请在指标区添加第 2 个指标，或到功能设置填写固定目标'))
    }
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, 'KPI图不支持同比 / 环比')
  }
  else if (type === 'table') {
    if (dims.length === 0 && metrics.length === 0) {
      issues.push(issue('dimensions', '请至少添加维度或指标'))
      issues.push(issue('metrics', '请至少添加维度或指标'))
    }
    pushContrastFieldIssues(issues, metrics)
    pushDateDimContrastConflict(issues, dims, contrastMetrics, fields)
  }
  else if (type === 'bar' || type === 'line') {
    const label = type === 'bar' ? '柱状图' : '折线图'
    if (dims.length < cardinality.dimensions.min)
      issues.push(issue('dimensions', `${label}至少需要 1 个维度`))
    if (regulars.length < cardinality.metrics.min)
      issues.push(issue('metrics', `${label}至少需要 1 个指标`))
    if (regulars.length > 1 && dims.length > 1)
      markExtras(issues, 'dimensions', `${label}在多个指标时只能使用 1 个维度`, dims.slice(1) as Array<{ _uid?: string }>)
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, `${label}不支持同比 / 环比`)
  }
  else if (type === 'combo') {
    if (dims.length !== cardinality.dimensions.min)
      markExtras(issues, 'dimensions', '组合图需要恰好 1 个维度', dims.slice(cardinality.dimensions.max) as Array<{ _uid?: string }>)
    if (regulars.length < cardinality.metrics.min)
      issues.push(issue('metrics', '组合图至少需要 2 个指标'))
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, '组合图不支持同比 / 环比')
  }
  else if (type === 'pie' || type === 'funnel' || type === 'wordcloud') {
    const label = type === 'pie' ? '饼图' : type === 'funnel' ? '漏斗图' : '词云'
    if (dims.length !== cardinality.dimensions.min)
      markExtras(issues, 'dimensions', `${label}需要恰好 1 个维度`, dims.slice(cardinality.dimensions.max) as Array<{ _uid?: string }>)
    if (regulars.length !== cardinality.metrics.min)
      markExtras(issues, 'metrics', `${label}需要恰好 1 个指标`, regulars.slice(cardinality.metrics.max) as Array<{ _uid?: string }>)
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, `${label}不支持同比 / 环比`)
  }
  else if (type === 'treemap') {
    if (dims.length < cardinality.dimensions.min)
      issues.push(issue('dimensions', '矩形树图至少需要 1 个维度'))
    else if (dims.length > (cardinality.dimensions.max ?? Number.POSITIVE_INFINITY))
      markExtras(issues, 'dimensions', '矩形树图最多 3 个维度', dims.slice(cardinality.dimensions.max) as Array<{ _uid?: string }>)
    if (regulars.length !== cardinality.metrics.min)
      markExtras(issues, 'metrics', '矩形树图需要恰好 1 个指标', regulars.slice(cardinality.metrics.max) as Array<{ _uid?: string }>)
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, '矩形树图不支持同比 / 环比')
  }
  else if (type === 'heatmap') {
    if (dims.length !== cardinality.dimensions.min)
      markExtras(issues, 'dimensions', '热力图需要恰好 2 个维度', dims.slice(cardinality.dimensions.max) as Array<{ _uid?: string }>)
    if (regulars.length !== cardinality.metrics.min)
      markExtras(issues, 'metrics', '热力图需要恰好 1 个指标', regulars.slice(cardinality.metrics.max) as Array<{ _uid?: string }>)
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, '热力图不支持同比 / 环比')
  }
  else if (type === 'scatter') {
    if (dims.length > (cardinality.dimensions.max ?? Number.POSITIVE_INFINITY))
      markExtras(issues, 'dimensions', '散点图最多 1 个维度', dims.slice(cardinality.dimensions.max) as Array<{ _uid?: string }>)
    if (regulars.length !== cardinality.metrics.min)
      markExtras(issues, 'metrics', '散点图需要恰好 2 个指标', regulars.slice(cardinality.metrics.max) as Array<{ _uid?: string }>)
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, '散点图不支持同比 / 环比')
  }
  else if (type === 'radar') {
    if (dims.length !== cardinality.dimensions.min)
      markExtras(issues, 'dimensions', '雷达图需要恰好 1 个维度', dims.slice(cardinality.dimensions.max) as Array<{ _uid?: string }>)
    if (regulars.length < cardinality.metrics.min)
      issues.push(issue('metrics', '雷达图至少需要 1 个指标'))
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, '雷达图不支持同比 / 环比')
  }
  else if (type === 'waterfall') {
    if (dims.length !== cardinality.dimensions.min)
      markExtras(issues, 'dimensions', '瀑布图需要恰好 1 个维度', dims.slice(cardinality.dimensions.max) as Array<{ _uid?: string }>)
    if (regulars.length !== cardinality.metrics.min)
      markExtras(issues, 'metrics', '瀑布图需要恰好 1 个指标', regulars.slice(cardinality.metrics.max) as Array<{ _uid?: string }>)
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, '瀑布图不支持同比 / 环比')
  }
  else if (type === 'trend') {
    if (dims.length !== cardinality.dimensions.min)
      markExtras(issues, 'dimensions', '趋势卡需要恰好 1 个维度', dims.slice(cardinality.dimensions.max) as Array<{ _uid?: string }>)
    if (regulars.length < cardinality.metrics.min)
      issues.push(issue('metrics', '趋势卡至少需要 1 个指标'))
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, '趋势卡不支持同比 / 环比')
  }
  else if (type === 'tornado') {
    if (dims.length !== cardinality.dimensions.min)
      markExtras(issues, 'dimensions', '对比条需要恰好 1 个维度', dims.slice(cardinality.dimensions.max) as Array<{ _uid?: string }>)
    if (regulars.length !== cardinality.metrics.min)
      markExtras(issues, 'metrics', '对比条需要恰好 2 个指标', regulars.slice(cardinality.metrics.max) as Array<{ _uid?: string }>)
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, '对比条不支持同比 / 环比')
  }
  else if (type === 'rank') {
    if (dims.length !== cardinality.dimensions.min)
      markExtras(issues, 'dimensions', '排行榜需要恰好 1 个维度', dims.slice(cardinality.dimensions.max) as Array<{ _uid?: string }>)
    if (regulars.length !== cardinality.metrics.min)
      markExtras(issues, 'metrics', '排行榜需要恰好 1 个指标', regulars.slice(cardinality.metrics.max) as Array<{ _uid?: string }>)
    if (contrastMetrics.length)
      pushBannedContrast(issues, contrastMetrics, '排行榜不支持同比 / 环比')
  }
  else {
    if (dims.length === 0 && metrics.length === 0) {
      issues.push(issue('dimensions', '请至少添加维度或指标'))
      issues.push(issue('metrics', '请至少添加维度或指标'))
    }
    pushContrastFieldIssues(issues, metrics)
    pushDateDimContrastConflict(issues, dims, contrastMetrics, fields)
  }

  pushQueryFilterIssues(issues, query)
  return issues
}

export function shelfMessage(issues: QueryIssue[] | undefined, shelf: QueryShelf) {
  return issues?.find(item => item.shelf === shelf && !item.uid)?.message
}

export function pillMessage(issues: QueryIssue[] | undefined, shelf: QueryShelf, uid: string) {
  return issues?.find(item => item.shelf === shelf && item.uid === uid)?.message
}

export function hasQueryShelves(query: VisQueryConfig) {
  return Boolean(
    query.dimensions?.length
    || query.rowDimensions?.length
    || query.colDimensions?.length
    || query.metrics?.length
    || query.orderList?.length
    || query.havingFilters?.length,
  )
}

export function hasQueryModelContent(query: VisQueryConfig) {
  return hasQueryShelves(query)
    || (query.filters ?? []).some(group => (group.conditions ?? []).length)
    || !!(query.params ?? []).length
}

/** 切换图表时清空维度 / 指标 / 排序 / 结果过滤 */
export function resetQueryShelves(query: VisQueryConfig) {
  query.dimensions = []
  query.rowDimensions = []
  query.colDimensions = []
  query.metrics = []
  query.orderList = []
  query.havingFilters = []
}

/** 换数据集：货架字段都属于旧集；日期基准和行数保留 */
export function resetQueryForDataset(query: VisQueryConfig) {
  resetQueryShelves(query)
  query.filters = []
  query.params = []
}
