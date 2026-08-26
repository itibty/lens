import type { VisQueryConfig, VisVisualConfig } from './types'
import { TREE_LABEL, TREE_NAME, TREE_PATH_SEP, unwrapChartDatum } from './chartDatum'
import { findContrastInfo } from './contrastExp'
import { dimensionAlias, metricAlias } from './types'

const PIVOT_SUBTOTAL_TOKEN = '__SUBTOTAL__'
const PIVOT_TOTAL_TOKEN = '__TOTAL__'

export interface DetailHit {
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

export function resolveAllowDetail(visual?: VisVisualConfig) {
  if (!visual?.allowDetail)
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
    const raw = valuesByAlias[alias] ?? valuesByAlias[dim.field]
    if (isPivotToken(raw))
      continue
    if (raw == null || raw === '') {
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
  return contextFromDims(query.dimensions ?? [], record)
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
  if (raw == null || raw === '')
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
  }
  if (query.asOfDate)
    body.asOfDate = query.asOfDate
  if (query.filters?.length)
    body.filters = query.filters
  if (query.params?.length)
    body.params = query.params
  if (grain.length)
    body.dimensions = grain
  const request: VIS.DetailQueryRequest = { query: body }
  if (hit?.filters.length)
    request.contextFilters = hit.filters
  if (globals?.globalFilters?.length)
    request.globalFilters = globals.globalFilters
  if (globals?.globalParams?.length)
    request.globalParams = globals.globalParams
  return request
}

export function detailMenuLabel(hit: DetailHit) {
  if (!hit.labels.length)
    return '查看明细'
  return `查看明细（${hit.labels.join(' · ')}）`
}

export function detailDrawerTitle(hit: DetailHit | null) {
  if (!hit?.labels.length)
    return '全部明细'
  return '明细'
}
