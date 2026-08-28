import type { DimensionPill, FilterPill, MetricPill, OrderPill, ParamPill } from '@/views/vis/shared/dnd'
import type { DatasetField, DatasetFieldDataType, VisCard, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { pruneAutoRefresh } from '@/views/vis/shared/cardRefresh'
import { pruneCardChrome } from '@/views/vis/shared/cardTheme'
import { pruneChartVisual } from '@/views/vis/shared/chartOptions'
import { allowsChartTheme, DEFAULT_CHART_THEME, resolveChartThemeId } from '@/views/vis/shared/chartPalette'
import { dateValueExpCount, normalizeDateExpValue } from '@/views/vis/shared/dateExp'
import { normalizeMetricForSave, stripPillUid } from '@/views/vis/shared/dnd'
import { normalizeFilterItemForSave, normalizeHavingItemForSave } from '@/views/vis/shared/filterValue'
import { pruneKpiVisual } from '@/views/vis/shared/kpiCard'
import { pruneNumberVisual } from '@/views/vis/shared/numberStyle'
import { pruneProgressVisual } from '@/views/vis/shared/progressCard'
import { pruneRankVisual } from '@/views/vis/shared/rankCard'
import { pruneStaticVisual } from '@/views/vis/shared/staticCard'
import { adoptRichtextModules } from '@/views/vis/shared/staticModules'
import { pruneTrendVisual } from '@/views/vis/shared/trendCard'
import { createEmptyCard, fromApiChartType, isPivotChart, needsDataset, toApiChartType, usesChartTheme } from '@/views/vis/shared/types'
import { allowContrastForChart } from './chartShape'
import { deriveDependentShelves } from './queryDependents'

function applyChartTheme(visual: VisVisualConfig) {
  if (!usesChartTheme(visual.chartType)) {
    delete visual.chartTheme
    return
  }
  const id = resolveChartThemeId(visual)
  if (id === DEFAULT_CHART_THEME || !allowsChartTheme(visual.chartType, id))
    delete visual.chartTheme
  else
    visual.chartTheme = id
}

const DATA_TYPE_MAP: Record<string, DatasetFieldDataType> = {
  STRING: 'string',
  NUMBER: 'number',
  DATE: 'date',
  DATETIME: 'datetime',
}

export function fromApiDataType(raw?: string): DatasetFieldDataType | undefined {
  if (!raw)
    return undefined
  return DATA_TYPE_MAP[raw.toUpperCase()]
}

export function fromConfSqlField(row: VIS.ConfSqlFieldInfo): DatasetField {
  const remark = row.remark?.trim()
  return {
    field: row.field,
    dataType: fromApiDataType(row.dataType),
    suggestRole: row.suggestRole,
    ...(remark ? { remark } : {}),
  }
}

function parseJson<T>(raw: string | object | undefined, fallback: T): T {
  if (raw && typeof raw === 'object')
    return raw as T
  if (typeof raw !== 'string' || !raw.trim())
    return fallback
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return fallback
  }
}

export function fromVisCardInfo(info: VIS.VisCardInfo): VisCard {
  const empty = createEmptyCard()
  const query = parseJson<VisQueryConfig>(info.queryJson, {
    ...empty.query,
    datasetId: info.datasetId || '',
  })
  const visual = parseJson<VisVisualConfig>(info.visualJson, {
    ...empty.visual,
    chartType: fromApiChartType(info.chartType),
  })
  visual.chartType = fromApiChartType(info.chartType || visual.chartType)
  const datasetId = String(query.datasetId || info.datasetId || '')
  if (!needsDataset(visual.chartType) || datasetId === '0')
    query.datasetId = ''
  else
    query.datasetId = datasetId
  applyChartTheme(visual)
  pruneCardChrome(visual)
  pruneAutoRefresh(visual)
  adoptRichtextModules(visual)
  return {
    id: info.id || '',
    name: info.cardName || empty.name,
    desc: info.cardDesc || '',
    updatedAt: info.modifyAt != null ? String(info.modifyAt) : '',
    status: info.status === 'DBL' ? 'DBL' : 'EBL',
    query,
    visual,
  }
}

function normalizeVisualForSave(visual: VisVisualConfig, query?: VisQueryConfig): VisVisualConfig {
  const next = pruneStaticVisual({ ...visual })
  pruneChartVisual(next, query)
  pruneCardChrome(next)
  pruneNumberVisual(next)
  pruneTrendVisual(next)
  pruneRankVisual(next)
  pruneProgressVisual(next)
  pruneKpiVisual(next)
  applyChartTheme(next)
  const title = next.title?.trim()
  if (title)
    next.title = title
  else
    delete next.title
  const remark = next.description?.trim()
  if (next.showDescription && remark)
    next.description = remark
  else
    delete next.description
  if (next.showTitle)
    next.showTitle = true
  else
    delete next.showTitle
  if (next.showDescription)
    next.showDescription = true
  else
    delete next.showDescription
  if (next.allowDetail && needsDataset(next.chartType))
    next.allowDetail = true
  else
    delete next.allowDetail
  if (next.allowDownload && needsDataset(next.chartType))
    next.allowDownload = true
  else
    delete next.allowDownload
  pruneAutoRefresh(next)
  return next
}

export function toVisCardSaveRequest(card: VisCard, query: VisQueryConfig): VIS.VisCardSaveRequest {
  const desc = card.desc?.trim()
  const body: VIS.VisCardSaveRequest = {
    cardName: card.name.trim(),
    datasetId: query.datasetId,
    chartType: toApiChartType(card.visual.chartType),
    status: card.status === 'DBL' ? 'DBL' : 'EBL',
    queryJson: JSON.stringify(query),
    visualJson: JSON.stringify(normalizeVisualForSave(card.visual, query)),
  }
  if (desc)
    body.cardDesc = desc
  if (card.id)
    body.id = card.id
  return body
}

function normalizeAlias<T extends { label?: string }>(item: T): T {
  const label = item.label?.trim()
  if (!label) {
    const { label: _drop, ...rest } = item
    return rest as T
  }
  return { ...item, label }
}

function normalizeDimensions(list: DimensionPill[] | VIS.DimensionItem[] | undefined) {
  return ((list ?? []) as DimensionPill[]).map(d => normalizeAlias(stripPillUid({ ...d })))
}

function normalizeOrderForSave(item: OrderPill): VIS.OrderItem {
  return {
    field: item.field,
    dir: item.dir === 'desc' ? 'desc' : 'asc',
  }
}

export function normalizeQueryForRequest(query: VisQueryConfig, chartType?: string): VisQueryConfig {
  const pivot = isPivotChart(chartType)
  const metrics = (query.metrics ?? []) as MetricPill[]
  const { orderList, havingFilters } = deriveDependentShelves(query, chartType)
  const next: VisQueryConfig = {
    datasetId: needsDataset(chartType) ? query.datasetId : '',
    metrics: metrics.map((m) => {
      const saved = normalizeMetricForSave(stripPillUid({ ...m }))
      if (pivot || !allowContrastForChart(chartType))
        delete saved.contrast
      return saved
    }),
    filters: (query.filters ?? []).map(group => ({
      combineOp: group.combineOp === 'or' ? 'or' as const : 'and' as const,
      conditions: (group.conditions as FilterPill[])
        .map(c => normalizeFilterItemForSave(stripPillUid({ ...c })))
        .filter(c => c.field),
    })).filter(group => group.conditions.length > 0),
    orderList: orderList.map(normalizeOrderForSave),
    havingFilters: havingFilters
      .map(h => normalizeHavingItemForSave(stripPillUid({ ...h })))
      .filter(h => h.field && h.agg),
    params: ((query.params ?? []) as ParamPill[])
      .map(p => normalizeParamItemForSave(stripPillUid({ ...p })))
      .filter((p): p is VIS.FilterItem => p != null),
  }
  if (pivot) {
    next.rowDimensions = normalizeDimensions(query.rowDimensions)
    next.colDimensions = normalizeDimensions(query.colDimensions)
  }
  else {
    next.dimensions = normalizeDimensions(query.dimensions)
  }
  if (typeof query.limit === 'number' && query.limit > 0)
    next.limit = query.limit
  const asOfDate = query.asOfDate?.trim()
  if (asOfDate)
    next.asOfDate = asOfDate
  return next
}

export function toPivotQuery(query: VisQueryConfig): VIS.PivotQueryConfig {
  const n = normalizeQueryForRequest(query, 'pivot')
  const body: VIS.PivotQueryConfig = {
    datasetId: n.datasetId,
    metrics: n.metrics ?? [],
  }
  if (n.asOfDate)
    body.asOfDate = n.asOfDate
  if (n.rowDimensions?.length)
    body.rowDimensions = n.rowDimensions
  if (n.colDimensions?.length)
    body.colDimensions = n.colDimensions
  if (n.filters?.length)
    body.filters = n.filters
  if (n.params?.length)
    body.params = n.params
  if (n.havingFilters?.length)
    body.havingFilters = n.havingFilters
  if (n.orderList?.length)
    body.orderList = n.orderList
  if (n.limit)
    body.limit = n.limit
  return body
}

export type { QueryIssue, QueryShelf } from './chartShape'

export {
  allowContrastForChart,
  collectQueryIssues,
  hasQueryModelContent,
  hasQueryShelves,
  listChartConstraints,
  pillMessage,
  resetQueryForDataset,
  resetQueryShelves,
  shelfMessage,
} from './chartShape'

export { orderSourceDimensions, reconcileQueryDependents } from './queryDependents'

export { isStaticChart, needsDataset } from '@/views/vis/shared/types'

export function normalizeParamItemForSave(item: VIS.FilterItem): VIS.FilterItem | null {
  const field = item.field?.trim()
  if (!field)
    return null
  const next: VIS.FilterItem = { field }
  if (item.label?.trim())
    next.label = item.label.trim()
  if (item.valueExp) {
    next.valueExp = item.valueExp
    const value = normalizeDateExpValue(item.valueExp, item.value as unknown[])
    if (dateValueExpCount(item.valueExp) > 0)
      next.value = value as VIS.FilterItem['value']
    return next
  }
  const raw = Array.isArray(item.value)
    ? item.value.filter(v => v != null && String(v) !== '')
    : []
  if (!raw.length)
    return null
  next.value = raw as unknown as VIS.FilterItem['value']
  return next
}

export {
  apiErrorMessage,
  execSqlsFromBizError,
  VIS_SHOW_SQL,
  visQueryOptions,
} from '@/views/vis/shared/visRequest'
