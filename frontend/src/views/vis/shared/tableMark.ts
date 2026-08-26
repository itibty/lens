/**
 * 表格 / 透视数据标注：
 * visual.table.marks → prepareTableMarks → bindMarkColumnStyle
 *
 * - 条件按整行判定；未写完的条件求值时跳过
 * - 条件为空：选中字段整列涂
 * - 样式只写 visual，不改查询
 * - VTable 的 color 函数返回 undefined 会把字画没，因此整份 style 用函数，未命中只回 base
 */
import type { FilterOp } from './filterValue'
import type {
  DatasetField,
  DatasetFieldDataType,
  VisQueryConfig,
  VisTableMarkFilter,
  VisTableMarkRule,
  VisTableMarkStyle,
  VisVisualConfig,
} from './types'
import { isDateExpReady, resolveDateValueWindow } from './dateExp'
import { incompleteFilterMessage, needsFilterValue } from './filterValue'
import { dimensionAlias, isPivotChart, metricAlias } from './types'

export interface MarkFieldOption {
  alias: string
  field: string
  dataType?: DatasetFieldDataType
}

export interface PreparedMarkRule {
  fields: Set<string>
  combineOp: 'and' | 'or'
  filters: PreparedFilter[]
  style: VisTableMarkStyle
}

interface PreparedFilter {
  field: string
  window?: [string, string]
  op?: FilterOp
  value?: unknown[]
}

interface MarkStyleArg {
  col: number
  row: number
  table: { getCellOriginRecord: (col: number, row: number) => unknown }
}

const COMPARE = {
  eq: (a: string | number, b: string | number) => a === b,
  ne: (a: string | number, b: string | number) => a !== b,
  gt: (a: string | number, b: string | number) => a > b,
  gte: (a: string | number, b: string | number) => a >= b,
  lt: (a: string | number, b: string | number) => a < b,
  lte: (a: string | number, b: string | number) => a <= b,
} as const

export function emptyMarkRule(): VisTableMarkRule {
  return { fields: [], combineOp: 'and', filters: [] }
}

export function hasRenderableMarkRule(rule: VisTableMarkRule) {
  return (rule.fields ?? []).some(Boolean) && hasMarkStyle(rule.style)
}

/** 预览指纹：有字段且有样式才算表单完成，空组 / 半成品不触发刷新 */
export function previewableTableMarks(visual?: VisVisualConfig) {
  return (visual?.table?.marks ?? []).filter(hasRenderableMarkRule)
}

/**
 * 与渲染一致：只序列化 prepare 后的生效标注。
 * 未完成条件、_uid、单条件时的 combineOp 变化不计入指纹。
 */
export function tableMarksPreviewFingerprint(visual?: VisVisualConfig, asOfDate?: string) {
  return prepareTableMarks(visual, asOfDate).map(rule => ({
    fields: [...rule.fields].sort(),
    combineOp: rule.filters.length > 1 ? rule.combineOp : 'and',
    filters: rule.filters,
    style: rule.style,
  }))
}

/** 货架改显示名时，把标注里的旧 alias 换成新的 */
export function remapTableMarkAliases(visual: VisVisualConfig, from: string, to: string) {
  if (!from || from === to)
    return
  const marks = visual.table?.marks
  if (!marks?.length)
    return
  let changed = false
  const next = marks.map((rule) => {
    const fields = (rule.fields ?? []).map(field => field === from ? to : field)
    const filters = (rule.filters ?? []).map(item => (
      item.field === from ? { ...item, field: to } : item
    ))
    const fieldsChanged = fields.some((field, i) => field !== (rule.fields ?? [])[i])
    const filtersChanged = filters.some((item, i) => item.field !== rule.filters?.[i]?.field)
    if (!fieldsChanged && !filtersChanged)
      return rule
    changed = true
    return { ...rule, fields, filters }
  })
  if (changed)
    visual.table = { ...visual.table, marks: next }
}

export function prepareTableMarks(
  visual?: VisVisualConfig,
  asOfDate?: string,
): PreparedMarkRule[] {
  return previewableTableMarks(visual)
    .map(rule => prepareRule(rule, asOfDate))
    .filter((rule): rule is PreparedMarkRule => !!rule)
}

export function bindMarkColumnStyle(
  rules: PreparedMarkRule[],
  field: string,
  base?: Record<string, unknown>,
) {
  if (!rules.some(rule => rule.fields.has(field)))
    return base
  return (args: MarkStyleArg) => ({
    ...base,
    ...toVTableStyle(resolveMarkStyle(rules, field, recordFromArgs(args))),
  })
}

export function listMarkableFields(
  query: VisQueryConfig | VIS.QueryConfig | undefined,
  fields: DatasetField[] | undefined,
  chartType?: string,
): MarkFieldOption[] {
  const typeMap = new Map((fields ?? []).map(item => [item.field, item.dataType]))
  const out: MarkFieldOption[] = []
  const seen = new Set<string>()
  for (const dim of queryDimensions(query, chartType)) {
    pushField(
      out,
      seen,
      dimensionAlias(dim),
      dim.field,
      typeMap.get(dim.field) || (dim.timeGrain ? 'date' : undefined),
    )
  }
  for (const metric of query?.metrics ?? []) {
    pushField(
      out,
      seen,
      metricAlias(metric),
      metric.field,
      typeMap.get(metric.field) || 'number',
    )
  }
  return out
}

export function markFieldDataType(
  options: MarkFieldOption[],
  alias?: string,
): DatasetFieldDataType {
  return options.find(item => item.alias === alias)?.dataType || 'string'
}

function hasMarkStyle(style?: VisTableMarkStyle) {
  return !!(style?.color || style?.bgColor || style?.bold || style?.italic)
}

function isMarkFilterReady(item: VisTableMarkFilter) {
  if (!item.field)
    return false
  if (item.valueExp)
    return isDateExpReady(item.valueExp, item.value)
  if (!item.op)
    return false
  return !incompleteFilterMessage({ op: item.op, value: item.value })
}

function prepareFilter(item: VisTableMarkFilter, asOfDate?: string): PreparedFilter | null {
  if (!isMarkFilterReady(item))
    return null
  if (item.valueExp) {
    const window = resolveDateValueWindow(item.valueExp, item.value, asOfDate)
    return window ? { field: item.field, window } : null
  }
  return { field: item.field, op: item.op, value: item.value }
}

function prepareRule(rule: VisTableMarkRule, asOfDate?: string): PreparedMarkRule | null {
  const fields = new Set((rule.fields ?? []).filter(Boolean))
  if (!fields.size)
    return null
  const filters: PreparedFilter[] = []
  for (const item of rule.filters ?? []) {
    const next = prepareFilter(item, asOfDate)
    if (next)
      filters.push(next)
  }
  return {
    fields,
    combineOp: rule.combineOp === 'or' ? 'or' : 'and',
    filters,
    style: rule.style ?? {},
  }
}

function cellText(cell: unknown) {
  if (cell == null || cell === '')
    return ''
  return String(cell).trim()
}

/** 日期/时间收到可比较的 yyyy-MM-dd 前缀；对不齐则整段当字符串 */
function cellCompareKey(cell: unknown) {
  const text = cellText(cell)
  if (!text)
    return ''
  return text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? text
}

function asNumber(raw: unknown) {
  if (typeof raw === 'number' && Number.isFinite(raw))
    return raw
  if (typeof raw === 'boolean')
    return Number(raw)
  const text = cellText(raw)
  if (!text)
    return NaN
  const n = Number(text.replace(/,/g, ''))
  return Number.isFinite(n) ? n : NaN
}

function valuesOf(value: unknown[] | undefined) {
  return (value ?? []).filter(item => item != null && item !== '')
}

function matchBetween(cell: unknown, vals: unknown[]) {
  const left = cellCompareKey(vals[0])
  const right = cellCompareKey(vals[1])
  const key = cellCompareKey(cell)
  if (left && right && key)
    return key >= left && key <= right
  const n = asNumber(cell)
  const a = asNumber(vals[0])
  const b = asNumber(vals[1])
  return Number.isFinite(n) && Number.isFinite(a) && Number.isFinite(b) && n >= a && n <= b
}

function matchCompare(op: FilterOp, cell: unknown, other: unknown) {
  const cmp = COMPARE[op as keyof typeof COMPARE]
  if (!cmp)
    return false
  const num = asNumber(cell)
  const right = asNumber(other)
  if (Number.isFinite(num) && Number.isFinite(right))
    return cmp(num, right)
  return cmp(cellCompareKey(cell), cellCompareKey(other))
}

function matchOp(cell: unknown, op: FilterOp, value?: unknown[]) {
  if (op === 'is_null')
    return cell == null || cell === ''
  if (op === 'is_not_null')
    return cell != null && cell !== ''

  const vals = valuesOf(value)
  if (needsFilterValue(op) && !vals.length)
    return false

  if (op === 'in')
    return vals.some(item => cellText(item) === cellText(cell))
  if (op === 'not_in')
    return vals.every(item => cellText(item) !== cellText(cell))
  if (op === 'like')
    return cellText(cell).includes(cellText(vals[0]))
  if (op === 'not_like')
    return !cellText(cell).includes(cellText(vals[0]))
  if (op === 'between')
    return matchBetween(cell, vals)
  return matchCompare(op, cell, vals[0])
}

function matchPreparedFilter(row: Record<string, unknown>, item: PreparedFilter) {
  const cell = row[item.field]
  if (item.window)
    return inRange(cellCompareKey(cell), item.window[0], item.window[1])
  if (item.op)
    return matchOp(cell, item.op, item.value)
  return false
}

function inRange(key: string, start: string, end: string) {
  return !!key && key >= start && key <= end
}

function rowMatchesRule(row: Record<string, unknown> | null, rule: PreparedMarkRule) {
  if (!row)
    return false
  if (!rule.filters.length)
    return true
  if (rule.combineOp === 'or')
    return rule.filters.some(item => matchPreparedFilter(row, item))
  return rule.filters.every(item => matchPreparedFilter(row, item))
}

function resolveMarkStyle(
  rules: PreparedMarkRule[],
  field: string,
  row: Record<string, unknown> | null,
): VisTableMarkStyle | null {
  let next: VisTableMarkStyle | null = null
  for (const rule of rules) {
    if (!rule.fields.has(field) || !rowMatchesRule(row, rule))
      continue
    next = { ...(next ?? {}), ...rule.style }
  }
  return next && hasMarkStyle(next) ? next : null
}

function toVTableStyle(style: VisTableMarkStyle | null) {
  if (!style)
    return {}
  return {
    ...(style.color ? { color: style.color } : {}),
    ...(style.bgColor ? { bgColor: style.bgColor } : {}),
    ...(style.bold ? { fontWeight: 'bold' as const } : {}),
    ...(style.italic ? { fontStyle: 'italic' as const } : {}),
  }
}

function recordFromArgs(args: MarkStyleArg) {
  const raw = args.table.getCellOriginRecord(args.col, args.row)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function queryDimensions(
  query: VisQueryConfig | VIS.QueryConfig | undefined,
  chartType?: string,
) {
  if (isPivotChart(chartType)) {
    const pivot = query as VisQueryConfig | undefined
    return [...(pivot?.rowDimensions ?? []), ...(pivot?.colDimensions ?? [])]
  }
  return query?.dimensions ?? []
}

function pushField(
  out: MarkFieldOption[],
  seen: Set<string>,
  alias: string,
  field: string,
  dataType?: DatasetFieldDataType,
) {
  if (!alias || seen.has(alias))
    return
  seen.add(alias)
  out.push({ alias, field, dataType })
}
