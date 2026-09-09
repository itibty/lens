import type { VisQueryConfig, VisVisualConfig } from './types'
import { TREE_LABEL, TREE_NAME, TREE_PATH_SEP, unwrapChartDatum } from './chartDatum'
import { findContrastInfo } from './contrastExp'
import { dimensionAlias, metricAlias } from './types'

const PIVOT_SUBTOTAL_TOKEN = '__SUBTOTAL__'
const PIVOT_TOTAL_TOKEN = '__TOTAL__'

export interface DetailHit {
  metric?: string
  filters: VIS.FilterItem[]
  labels: string[]
}

export interface DetailMenuPayload {
  hit: DetailHit
  clientX: number
  clientY: number
}

export interface PivotPathMember {
  dimensionKey?: string
  value?: unknown
  indicatorKey?: string
}

export function hasConfiguredDetailFields(visual?: VisVisualConfig) {
  const fields = visual?.detail?.fields
  return Array.isArray(fields) && fields.length > 0 && fields.every(field => typeof field === 'string' && !!field.trim())
}

export function resolveAllowDetail(visual?: VisVisualConfig) {
  if (!visual?.allowDetail || !hasConfiguredDetailFields(visual))
    return false
  const type = String(visual.chartType || '').toLowerCase()
  return type !== 'richtext' && type !== 'url'
}

export function grainDimensions(query?: VisQueryConfig): VIS.DimensionItem[] {
  if (!query)
    return []
  if (query.rowDimensions?.length || query.colDimensions?.length)
    return [...(query.rowDimensions ?? []), ...(query.colDimensions ?? [])]
  return query.dimensions ?? []
}

export function emptyDetailHit(): DetailHit {
  return { filters: [], labels: [] }
}

function isPivotToken(value: unknown) {
  const text = value == null ? '' : String(value)
  return text === PIVOT_SUBTOTAL_TOKEN || text === PIVOT_TOTAL_TOKEN
}

function asFilterValue(value: unknown): VIS.FilterItem['value'] {
  return [value] as unknown as VIS.FilterItem['value']
}

export function contextFromDims(
  dims: VIS.DimensionItem[],
  valuesByAlias: Record<string, unknown>,
): DetailHit {
  const filters: VIS.FilterItem[] = []
  const labels: string[] = []
  for (const dim of dims) {
    const alias = dimensionAlias(dim)
    const raw = Object.hasOwn(valuesByAlias, alias) ? valuesByAlias[alias] : valuesByAlias[dim.field]
    if (raw === undefined)
      continue
    if (isPivotToken(raw))
      continue
    if (raw == null) {
      const item: VIS.FilterItem = { field: dim.field, op: 'is_null' }
      if (dim.timeGrain)
        item.timeGrain = dim.timeGrain
      filters.push(item)
      labels.push(alias)
      continue
    }
    const item: VIS.FilterItem = {
      field: dim.field,
      op: 'eq',
      value: asFilterValue(raw),
    }
    if (dim.timeGrain)
      item.timeGrain = dim.timeGrain
    filters.push(item)
    labels.push(String(raw))
  }
  return { filters, labels }
}

export function isContrastField(
  query: VIS.QueryConfig,
  field?: string,
  data?: VIS.QueryDataResponse,
) {
  if (!field)
    return false
  const metric = (query.metrics ?? []).find(item => metricAlias(item) === field)
  if (metric?.contrast)
    return true
  return !!findContrastInfo(data, field)
}

export function contextFromTableRow(
  query: VisQueryConfig,
  record: Record<string, unknown> | undefined,
  field?: string,
  data?: VIS.QueryDataResponse,
): DetailHit | null {
  if (!record)
    return null
  if (isContrastField(query, field, data))
    return null
  const hit = contextFromDims(query.dimensions ?? [], record)
  if ((query.metrics ?? []).some(item => metricAlias(item) === field))
    hit.metric = field
  return hit
}

function dimValueOnDatum(dim: VIS.DimensionItem, values: Record<string, unknown>) {
  const alias = dimensionAlias(dim)
  if (values[alias] !== undefined)
    return values[alias]
  return values[dim.field]
}

function fillDimsFromTreePath(
  dims: VIS.DimensionItem[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  if (dims.some(dim => dimValueOnDatum(dim, values) !== undefined))
    return values
  const raw = values[TREE_NAME] ?? values[TREE_LABEL]
  if (raw == null)
    return values
  const parts = String(raw).split(TREE_PATH_SEP)
  const next = { ...values }
  dims.forEach((dim, index) => {
    const part = parts[index]
    if (part != null && part !== '')
      next[dimensionAlias(dim)] = part
  })
  return next
}

/** 几何图点击：只带点上已有的维。树图外层格子没有里层维值，不能当成空。 */
export function contextFromChartDatum(
  query: VisQueryConfig,
  datum: Record<string, unknown> | undefined,
): DetailHit | null {
  const rec = unwrapChartDatum(datum)
  if (!rec)
    return null
  const dims = query.dimensions ?? []
  if (!dims.length)
    return emptyDetailHit()
  const filled = fillDimsFromTreePath(dims, rec)
  const present = dims.filter(dim => dimValueOnDatum(dim, filled) !== undefined)
  if (!present.length)
    return null
  return contextFromDims(present, filled)
}

export function contextFromPivotPaths(
  query: VisQueryConfig,
  rowPaths: PivotPathMember[],
  colPaths: PivotPathMember[],
): DetailHit {
  const values: Record<string, unknown> = {}
  for (const item of [...rowPaths, ...colPaths]) {
    if (!item.dimensionKey || item.indicatorKey)
      continue
    values[item.dimensionKey] = item.value
  }
  return contextFromDims(grainDimensions(query), values)
}

export function buildDetailRequest(
  query: VisQueryConfig,
  hit?: DetailHit | null,
  globals?: { globalFilters?: VIS.FilterItem[], globalParams?: VIS.FilterItem[] },
): VIS.DetailQueryRequest {
  const grain = grainDimensions(query)
  const body: VIS.QueryConfig = {
    datasetId: query.datasetId,
    metrics: query.metrics,
  }
  if (query.asOfDate)
    body.asOfDate = query.asOfDate
  if (query.filters?.length)
    body.filters = query.filters
  if (query.params?.length)
    body.params = query.params
  if (grain.length)
    body.dimensions = grain
  const request: VIS.DetailQueryRequest = { query: body, metric: hit?.metric }
  if (hit?.filters.length)
    request.contextFilters = hit.filters
  if (globals?.globalFilters?.length)
    request.globalFilters = globals.globalFilters
  if (globals?.globalParams?.length)
    request.globalParams = globals.globalParams
  return request
}

export function detailMenuLabel(hit: DetailHit) {
  const labels = [...hit.labels, ...(hit.metric ? [hit.metric] : [])]
  return labels.length ? `查看明细（${labels.join(' · ')}）` : '查看明细'
}

export function detailDrawerTitle(hit: DetailHit | null) {
  return hit?.labels.length ? '明细' : '当前范围明细'
}
