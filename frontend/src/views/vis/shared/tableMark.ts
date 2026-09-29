/**
 * 表格 / 透视数据标注：
 * visual.table.marks → prepareTableMarks → bindMarkColumnStyle
 *
 * - 普通表格按整行判定，透视表注入交叉格 / 表头路径；未写完的条件求值时跳过
 * - 条件为空：选中字段整列涂
 * - 样式只写 visual，不改查询
 * - 数据格用整份 style 函数，未命中只回 base；透视表头另用带主题回退的逐属性函数
 */
import type { TYPES } from '@visactor/vtable'
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
  kind: 'dimension' | 'row' | 'column' | 'metric'
  depth: number
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

export type MarkStyleArg = Pick<TYPES.StylePropertyFunctionArg, 'col' | 'row' | 'table'>

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

/** 只叠加标注明确指定的属性；数字格式、进度条与主题回退保持原有配置。 */
export function bindMarkColumnStyle(
  rules: PreparedMarkRule[],
  field: string,
  base?: Record<string, unknown>,
  readRecord: (args: MarkStyleArg) => Record<string, unknown> | null = recordFromArgs,
) {
  if (!rules.some(rule => rule.fields.has(field)))
    return base
  return (args: MarkStyleArg) => ({
    ...base,
    ...toVTableStyle(resolveMarkStyle(rules, field, readRecord(args))),
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
  const pivot = query as VisQueryConfig | undefined
  const groups: Array<{ kind: MarkFieldOption['kind'], dimensions: VIS.DimensionItem[] }> = isPivotChart(chartType)
    ? [{ kind: 'row', dimensions: pivot?.rowDimensions ?? [] }, { kind: 'column', dimensions: pivot?.colDimensions ?? [] }]
    : [{ kind: 'dimension', dimensions: query?.dimensions ?? [] }]
  for (const { kind, dimensions } of groups) {
    for (const [depth, dim] of dimensions.entries()) {
      pushField(out, seen, {
        alias: dimensionAlias(dim),
        field: dim.field,
        dataType: typeMap.get(dim.field) || (dim.timeGrain ? 'date' : undefined),
        kind,
        depth,
      })
    }
  }
  for (const metric of query?.metrics ?? []) {
    pushField(out, seen, {
      alias: metricAlias(metric),
      field: metric.field,
      dataType: metric.agg === 'COUNT' || metric.agg === 'COUNT_DISTINCT' ? 'number' : typeMap.get(metric.field) || 'number',
      kind: 'metric',
      depth: 0,
    })
  }
  return out
}

/** 表头只拥有自身与同轴上级维度；多选时取公共条件范围。指标格可读整个交叉格。 */
export function listMarkFilterFields(options: MarkFieldOption[], targets: string[], chartType?: string) {
  if (!targets.length)
    return []
  if (!isPivotChart(chartType))
    return options
  return options.filter(option => targets.every((alias) => {
    const target = options.find(item => item.alias === alias)
    return target && (target.kind === 'metric' || (option.kind === target.kind && option.depth <= target.depth))
  }))
}

/** 新规则的表头与数据格分别配置；已有跨区域规则保留，允许逐项移除。 */
export function isMarkTargetDisabled(options: MarkFieldOption[], targets: string[], option: MarkFieldOption, chartType?: string) {
  return isPivotChart(chartType) && !targets.includes(option.alias)
    && targets.some(alias => options.find(item => item.alias === alias)?.kind !== option.kind)
}

/** 货架或应用字段变化时保留仍可用的条件，自动移除失效字段；不修改原规则。 */
export function syncTableMarkFields(rules: VisTableMarkRule[], options: MarkFieldOption[], chartType?: string) {
  const available = new Set(options.map(item => item.alias))
  const next = rules.map((rule) => {
    const fields = rule.fields.filter(field => available.has(field))
    const allowed = new Set(fields.length ? listMarkFilterFields(options, fields, chartType).map(item => item.alias) : [])
    const filters = rule.filters?.filter(item => allowed.has(item.field))
    if (fields.length === rule.fields.length && filters?.length === rule.filters?.length)
      return rule
    return { ...rule, fields, filters }
  })
  return next.every((rule, index) => rule === rules[index]) ? rules : next
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
  const n = asNumber(cell)
  const a = asNumber(vals[0])
  const b = asNumber(vals[1])
  if (Number.isFinite(n) && Number.isFinite(a) && Number.isFinite(b))
    return n >= a && n <= b
  const left = cellCompareKey(vals[0])
  const right = cellCompareKey(vals[1])
  const key = cellCompareKey(cell)
  if (left && right && key)
    return key >= left && key <= right
  return false
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
  // 缺失字段不是空值。表头、合计或已移除字段不能因 ne / is_null / OR 意外命中。
  if (rule.filters.some(item => !Object.hasOwn(row, item.field)))
    return false
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

function pushField(
  out: MarkFieldOption[],
  seen: Set<string>,
  option: MarkFieldOption,
) {
  if (!option.alias || seen.has(option.alias))
    return
  seen.add(option.alias)
  out.push(option)
}
