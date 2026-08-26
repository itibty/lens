import type { IHeaderTreeDefine, PivotTableConstructorOptions } from '@visactor/vtable'
import type { VisQueryConfig, VisVisualConfig } from './types'
import { TYPES } from '@visactor/vtable'
import { bindMarkColumnStyle, prepareTableMarks } from './tableMark'
import { resolvePivotPlaces, resolvePivotTreeDisplay, resolveTableStyle } from './tableStyle'
import { dimensionAlias, metricAlias } from './types'
import { resolveVTableLayout, resolveVTableTheme, VTABLE_EMPTY_TIP } from './vtableTheme'

/** 后端短 path 补到树/records 上的占位，表头再译成「小计 / 总计」 */
export const PIVOT_SUBTOTAL_TOKEN = '__SUBTOTAL__'
export const PIVOT_TOTAL_TOKEN = '__TOTAL__'

interface DimNode {
  dimensionKey: string
  value: string
  children: DimNode[]
}

function asPath(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : []
}

function memberKey(value: unknown): string {
  if (value == null)
    return ''
  return String(value)
}

export function formatPivotHeaderValue(value: unknown): string {
  const text = memberKey(value)
  if (text === PIVOT_SUBTOTAL_TOKEN)
    return '小计'
  if (text === PIVOT_TOTAL_TOKEN)
    return '总计'
  return text
}

/**
 * 与树节点对齐的维度取值。
 * grid：小计短 path 补一层「小计」子节点；tree：不补，数值挂在父行。
 */
function pathMembers(
  path: unknown[],
  fields: string[],
  role: string | undefined,
  padSubtotal = true,
): Array<{ key: string, value: string }> {
  if (!fields.length)
    return []
  if (role === 'total' || path.length === 0)
    return [{ key: fields[0], value: PIVOT_TOTAL_TOKEN }]

  const members: Array<{ key: string, value: string }> = []
  for (let i = 0; i < path.length && i < fields.length; i++)
    members.push({ key: fields[i], value: memberKey(path[i]) })

  if (padSubtotal && role === 'subtotal' && path.length < fields.length)
    members.push({ key: fields[path.length], value: PIVOT_SUBTOTAL_TOKEN })

  return members
}

function reorderDimNodes(
  nodes: DimNode[],
  subtotalAtStart: boolean,
  totalAtStart: boolean,
) {
  for (const node of nodes)
    reorderDimNodes(node.children, subtotalAtStart, totalAtStart)

  const totals: DimNode[] = []
  const subtotals: DimNode[] = []
  const rest: DimNode[] = []
  for (const node of nodes) {
    if (node.value === PIVOT_TOTAL_TOKEN)
      totals.push(node)
    else if (node.value === PIVOT_SUBTOTAL_TOKEN)
      subtotals.push(node)
    else
      rest.push(node)
  }

  const next: DimNode[] = []
  if (totalAtStart)
    next.push(...totals)
  if (subtotalAtStart)
    next.push(...subtotals)
  next.push(...rest)
  if (!subtotalAtStart)
    next.push(...subtotals)
  if (!totalAtStart)
    next.push(...totals)
  nodes.splice(0, nodes.length, ...next)
}

function insertMembers(roots: DimNode[], members: Array<{ key: string, value: string }>) {
  let nodes = roots
  for (let i = 0; i < members.length; i++) {
    const { key, value } = members[i]
    let node = nodes.find(item => item.dimensionKey === key && item.value === value)
    if (!node) {
      node = { dimensionKey: key, value, children: [] }
      nodes.push(node)
    }
    if (i < members.length - 1)
      nodes = node.children
  }
}

function toHeaderTree(
  nodes: DimNode[],
  leafChildren?: IHeaderTreeDefine[],
  treeDisplay = false,
): IHeaderTreeDefine[] {
  return nodes.map((node) => {
    const children = node.children.length
      ? toHeaderTree(node.children, leafChildren, treeDisplay)
      : leafChildren
    const header: IHeaderTreeDefine = {
      dimensionKey: node.dimensionKey,
      value: node.value,
    }
    if (children?.length) {
      header.children = children
      if (treeDisplay)
        header.hierarchyState = TYPES.HierarchyState.expand
    }
    return header
  })
}

function buildRowTree(
  rows: VIS.PivotRow[] | undefined,
  rowFields: string[],
  treeDisplay = false,
  subtotalAtStart = false,
  totalAtStart = false,
): IHeaderTreeDefine[] {
  if (!rowFields.length)
    return []
  const roots: DimNode[] = []
  for (const row of rows ?? [])
    insertMembers(roots, pathMembers(asPath(row.path), rowFields, row.role, !treeDisplay))
  if (!treeDisplay)
    reorderDimNodes(roots, subtotalAtStart, totalAtStart)
  else
    reorderDimNodes(roots, false, totalAtStart)
  return toHeaderTree(roots, undefined, treeDisplay)
}

function buildColumnTree(
  columns: VIS.PivotColumn[] | undefined,
  colFields: string[],
  metrics: string[],
  subtotalAtStart = false,
  totalAtStart = false,
): IHeaderTreeDefine[] {
  const indicators: IHeaderTreeDefine[] = metrics.map(metric => ({
    indicatorKey: metric,
    value: metric,
  }))
  if (!colFields.length)
    return indicators
  const roots: DimNode[] = []
  for (const column of columns ?? [])
    insertMembers(roots, pathMembers(asPath(column.path), colFields, column.role))
  reorderDimNodes(roots, subtotalAtStart, totalAtStart)
  const tree = toHeaderTree(roots, indicators)
  return tree.length ? tree : indicators
}

function buildRecords(data: VIS.PivotQueryResponse, treeDisplay = false): Record<string, unknown>[] {
  const rowFields = data.rowFields ?? []
  const colFields = data.columnFields ?? []
  const metrics = data.metrics ?? []
  const colById = new Map((data.columns ?? []).map(column => [column.id, column]))
  const records: Record<string, unknown>[] = []

  for (const row of data.rows ?? []) {
    const rowPart: Record<string, unknown> = {}
    for (const item of pathMembers(asPath(row.path), rowFields, row.role, !treeDisplay))
      rowPart[item.key] = item.value

    const values = (row.values ?? {}) as Record<string, Record<string, unknown> | undefined>
    for (const [colId, metricMap] of Object.entries(values)) {
      const column = colById.get(colId)
      if (!column)
        continue
      const rec: Record<string, unknown> = { ...rowPart }
      for (const item of pathMembers(asPath(column.path), colFields, column.role))
        rec[item.key] = item.value
      for (const metric of metrics)
        rec[metric] = metricMap?.[metric] ?? null
      records.push(rec)
    }
  }
  return records
}

function isPivotDetailRow(row: VIS.PivotRow) {
  return row.role !== 'total' && row.role !== 'subtotal'
}

/** 没有明细行（只有总计/小计或空数组）视为无数据 */
export function isPivotDataEmpty(data: VIS.PivotQueryResponse) {
  return !(data.rows ?? []).some(isPivotDetailRow)
}

export type PivotSortOrder = 'asc' | 'desc'

export interface PivotHeaderSortPath {
  dimensionKey?: string
  value?: string
  indicatorKey?: string
}

export interface PivotHeaderSortState {
  order: PivotSortOrder
  paths: PivotHeaderSortPath[]
}

export function nextPivotSortOrder(current?: string | null): PivotSortOrder | null {
  const order = String(current || 'normal').toLowerCase()
  if (order === 'asc')
    return 'desc'
  if (order === 'desc')
    return null
  return 'asc'
}

function isPinnedHeaderValue(value: unknown) {
  const text = memberKey(value)
  return text === PIVOT_SUBTOTAL_TOKEN || text === PIVOT_TOTAL_TOKEN
}

function cloneHeaderTree(nodes: IHeaderTreeDefine[]): IHeaderTreeDefine[] {
  return nodes.map((node) => {
    const next: IHeaderTreeDefine = { ...node }
    if (node.children)
      next.children = cloneHeaderTree(node.children as IHeaderTreeDefine[])
    return next
  })
}

function toSortNumber(value: unknown): number | null {
  if (value == null || value === '')
    return null
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function compareMetricValue(a: unknown, b: unknown, order: PivotSortOrder) {
  const left = toSortNumber(a)
  const right = toSortNumber(b)
  if (left == null && right == null)
    return 0
  if (left == null)
    return 1
  if (right == null)
    return -1
  const result = left - right
  return order === 'asc' ? result : -result
}

function sortKeepingPinned(
  nodes: IHeaderTreeDefine[],
  compare: (a: IHeaderTreeDefine, b: IHeaderTreeDefine) => number,
) {
  const pinned = nodes
    .map((node, index) => ({ node, index }))
    .filter(item => isPinnedHeaderValue(item.node.value) || !!(item.node as { indicatorKey?: string }).indicatorKey)
  const rest = nodes.filter(node => (
    !isPinnedHeaderValue(node.value) && !(node as { indicatorKey?: string }).indicatorKey
  ))
  rest.sort(compare)
  const next = [...rest]
  for (const item of pinned)
    next.splice(item.index, 0, item.node)
  return next
}

function indicatorKeyOf(paths: PivotHeaderSortPath[]) {
  for (let i = paths.length - 1; i >= 0; i--) {
    if (paths[i]?.indicatorKey)
      return paths[i].indicatorKey
  }
  return undefined
}

/** 点到的是指标头，或单指标藏了名称时点列表头，都算按该指标排序 */
export function resolveIndicatorSortKey(paths: PivotHeaderSortPath[] | undefined, metrics: string[]) {
  return indicatorKeyOf(paths ?? []) ?? (metrics.length === 1 ? metrics[0] : undefined)
}

function metricLookupKey(rowVals: string[], colVals: string[], metric: string) {
  return `${rowVals.join('\u0001')}\0${colVals.join('\u0001')}\0${metric}`
}

function buildMetricLookup(
  records: Record<string, unknown>[],
  rowFields: string[],
  colFields: string[],
  metric: string,
) {
  const map = new Map<string, unknown>()
  for (const record of records) {
    const rowVals = rowFields.map(field => memberKey(record[field]))
    const colVals = colFields.map(field => memberKey(record[field]))
    map.set(metricLookupKey(rowVals, colVals, metric), record[metric])
  }
  return map
}

function applyRowMetricSort(
  tree: IHeaderTreeDefine[],
  records: Record<string, unknown>[],
  rowFields: string[],
  colFields: string[],
  state: PivotHeaderSortState,
  metric: string,
) {
  const colVals = colFields.map((field) => {
    const hit = state.paths.find(item => item.dimensionKey === field)
    return hit ? memberKey(hit.value) : ''
  })
  const lookup = buildMetricLookup(records, rowFields, colFields, metric)

  const walk = (nodes: IHeaderTreeDefine[], rowPrefix: string[]): IHeaderTreeDefine[] => {
    const mapped = nodes.map((node) => {
      if (!node.dimensionKey || !Array.isArray(node.children) || !node.children.length)
        return node
      return {
        ...node,
        children: walk(node.children as IHeaderTreeDefine[], [...rowPrefix, memberKey(node.value)]),
      }
    })
    const hasDeeperDim = mapped.some(node => (
      (node.children as IHeaderTreeDefine[] | undefined)?.some(child => child.dimensionKey)
    ))
    if (hasDeeperDim)
      return mapped
    return sortKeepingPinned(mapped, (a, b) => compareMetricValue(
      lookup.get(metricLookupKey([...rowPrefix, memberKey(a.value)], colVals, metric)),
      lookup.get(metricLookupKey([...rowPrefix, memberKey(b.value)], colVals, metric)),
      state.order,
    ))
  }

  return walk(cloneHeaderTree(tree), [])
}

/** 空结果常不带 fields；用当前查询补表头 */
export function resolvePivotSchema(data: VIS.PivotQueryResponse, query?: VisQueryConfig) {
  const metrics = data.metrics?.length
    ? data.metrics
    : (query?.metrics ?? []).map(metricAlias).filter(Boolean)
  const rowFields = data.rowFields?.length
    ? data.rowFields
    : (query?.rowDimensions ?? []).map(dimensionAlias).filter(Boolean)
  const colFields = data.columnFields?.length
    ? data.columnFields
    : (query?.colDimensions ?? []).map(dimensionAlias).filter(Boolean)
  return { metrics, rowFields, colFields }
}

const PIVOT_TREE_INDENT = 24
const PIVOT_TREE_ROW_TEXT = 128
const PIVOT_TREE_ROW_GUTTER = 36

function treeRowHeaderWidth(depth: number) {
  return PIVOT_TREE_ROW_GUTTER + PIVOT_TREE_INDENT * Math.max(0, depth - 1) + PIVOT_TREE_ROW_TEXT
}

function dimDefines(
  fields: string[],
  treeWidth?: number,
  marks: ReturnType<typeof prepareTableMarks> = [],
  leafShowSort = false,
) {
  return fields.map((field, index) => ({
    dimensionKey: field,
    title: field,
    headerFormat: (value: unknown) => formatPivotHeaderValue(value),
    headerStyle: bindMarkColumnStyle(marks, field),
    showSort: leafShowSort && index === fields.length - 1,
    ...(treeWidth != null ? { width: treeWidth } : {}),
  }))
}

/** 后端交叉结果 → VTable 自定义树 + records；不开 totals，避免再聚合 */
export function buildPivotTableOption(
  data: VIS.PivotQueryResponse,
  visual?: VisVisualConfig,
  query?: VisQueryConfig,
  sortState?: PivotHeaderSortState | null,
): PivotTableConstructorOptions | null {
  const { metrics, rowFields, colFields } = resolvePivotSchema(data, query)
  if (!metrics.length)
    return null

  const empty = isPivotDataEmpty(data)
  const treeDisplay = resolvePivotTreeDisplay(visual)
  const places = resolvePivotPlaces(visual)
  const sortColumn = resolveTableStyle(visual).sortColumn
  const records = empty ? [] : buildRecords(data, treeDisplay)
  const marks = prepareTableMarks(visual, query?.asOfDate)
  const sortMetric = resolveIndicatorSortKey(sortState?.paths, metrics)
  const activeSort = sortColumn && !empty && sortMetric && sortState ? sortState : null
  const hideIndicatorName = !empty && metrics.length === 1

  let rowTree = empty || !rowFields.length
    ? undefined
    : buildRowTree(
        data.rows,
        rowFields,
        treeDisplay,
        places.rowSubtotal === 'start',
        places.rowTotal === 'start',
      )
  const columnTree = empty
    ? undefined
    : buildColumnTree(
        data.columns,
        colFields,
        metrics,
        places.columnSubtotal === 'start',
        places.columnTotal === 'start',
      )

  if (activeSort && sortMetric && rowTree)
    rowTree = applyRowMetricSort(rowTree, records, rowFields, colFields, activeSort, sortMetric)

  const option: PivotTableConstructorOptions = {
    records,
    rows: dimDefines(rowFields, treeDisplay ? treeRowHeaderWidth(rowFields.length) : undefined, marks),
    columns: dimDefines(colFields, undefined, marks, sortColumn && hideIndicatorName),
    indicators: metrics.map(metric => ({
      indicatorKey: metric,
      title: metric,
      width: 120,
      showSort: sortColumn && !hideIndicatorName,
      style: bindMarkColumnStyle(marks, metric, { textAlign: 'right' }),
    })),
    rowTree,
    columnTree,
    rowHierarchyType: treeDisplay ? 'tree' : 'grid',
    rowHierarchyIndent: treeDisplay ? PIVOT_TREE_INDENT : undefined,
    rowHierarchyTextStartAlignment: treeDisplay || undefined,
    rowExpandLevel: treeDisplay ? rowFields.length : undefined,
    indicatorsAsCol: true,
    hideIndicatorName,
    supplementIndicatorNodes: empty,
    parseCustomTreeToMatchRecords: !empty,
    emptyTip: empty ? { ...VTABLE_EMPTY_TIP } : undefined,
    corner: { titleOnDimension: 'row' },
    formatCopyValue: (value: string) => value
      .replaceAll(PIVOT_SUBTOTAL_TOKEN, '小计')
      .replaceAll(PIVOT_TOTAL_TOKEN, '总计'),
    ...resolveVTableLayout(empty),
    hover: { highlightMode: 'cross' },
    theme: resolveVTableTheme(visual),
    dataConfig: {
      aggregationRules: metrics.map(metric => ({
        indicatorKey: metric,
        field: metric,
        aggregationType: TYPES.AggregationType.NONE,
      })),
    },
    pivotSortState: activeSort
      ? [{ dimensions: activeSort.paths, order: activeSort.order }]
      : undefined,
  }
  return option
}
