/** filters / havingFilters 共用的 op ↔ value[] 约束 */

import type { DatasetFieldDataType } from './types'
import { dateValueExpCount, formatDateValueExpLabel, normalizeDateExpValue } from './dateExp'
import { isDateField } from './types'

export type FilterOp = NonNullable<VIS.FilterItem['op']>

export const FILTER_OPS: Array<{ label: string, value: FilterOp }> = [
  { label: '等于', value: 'eq' },
  { label: '不等于', value: 'ne' },
  { label: '大于', value: 'gt' },
  { label: '大于等于', value: 'gte' },
  { label: '小于', value: 'lt' },
  { label: '小于等于', value: 'lte' },
  { label: '属于', value: 'in' },
  { label: '不属于', value: 'not_in' },
  { label: '包含', value: 'like' },
  { label: '不包含', value: 'not_like' },
  { label: '区间', value: 'between' },
  { label: '为空', value: 'is_null' },
  { label: '非空', value: 'is_not_null' },
]

/** HAVING 指标值为数字，用数值类 op */
export const HAVING_OPS = FILTER_OPS.filter(op =>
  !['like', 'not_like'].includes(op.value),
)

/**
 * 按字段类型裁剪可选操作符：
 * - 字符串：相等 / 枚举 / 模糊匹配 / 空值
 * - 数字：比较 / 区间 / 枚举 / 空值（无模糊）
 * - 日期类：比较 / 区间 / 空值（无枚举与模糊）
 */
export function opsForDataType(dataType?: DatasetFieldDataType): FilterOp[] {
  switch (dataType) {
    case 'number':
      return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'not_in', 'is_null', 'is_not_null']
    case 'date':
    case 'datetime':
    case 'timestamp':
      return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'is_null', 'is_not_null']
    case 'string':
    default:
      return ['eq', 'ne', 'in', 'not_in', 'like', 'not_like', 'is_null', 'is_not_null']
  }
}

export function filterOpsForDataType(dataType?: DatasetFieldDataType) {
  const allowed = new Set(opsForDataType(dataType))
  return FILTER_OPS.filter(op => allowed.has(op.value))
}

export function filterOpLabel(op: FilterOp) {
  return FILTER_OPS.find(o => o.value === op)?.label || op
}

export type ValueArity = 'none' | 'one' | 'two' | 'many'

export function valueArity(op: FilterOp): ValueArity {
  if (op === 'is_null' || op === 'is_not_null')
    return 'none'
  if (op === 'between')
    return 'two'
  if (op === 'in' || op === 'not_in')
    return 'many'
  return 'one'
}

export function needsFilterValue(op: FilterOp) {
  return valueArity(op) !== 'none'
}

/** 刷新 / 保存时：需要值但未填齐则返回文案 */
export function incompleteFilterMessage(item: {
  op?: VIS.FilterItem['op']
  valueExp?: VIS.FilterItem['valueExp']
  value?: unknown
}): string | null {
  if (item.valueExp) {
    const need = dateValueExpCount(item.valueExp)
    if (need <= 0)
      return null
    const vals = Array.isArray(item.value) ? item.value : []
    for (let i = 0; i < need; i++) {
      if (isBlankFilterCell(vals[i]))
        return need === 1 ? '请填写日期快捷参数' : '请填写日期快捷区间'
    }
    return null
  }
  const op = (item.op || 'eq') as FilterOp
  if (!needsFilterValue(op))
    return null
  const raw = Array.isArray(item.value) ? item.value : []
  const arity = valueArity(op)
  if (arity === 'two') {
    if (isBlankFilterCell(raw[0]) || isBlankFilterCell(raw[1]))
      return '区间需要填写起止值'
    return null
  }
  if (arity === 'one')
    return isBlankFilterCell(raw[0]) ? '请填写值' : null
  return raw.some(v => !isBlankFilterCell(v)) ? null : '请填写值'
}

function isBlankFilterCell(value: unknown) {
  return value == null || value === '' || (typeof value === 'string' && !value.trim())
}

function normalizeFilterCell(value: unknown) {
  return typeof value === 'string' ? value.trim() : value
}

/** 切换 op / 类型时重置；未填写保持空数组，不写空串 / 空格 */
export function defaultValueForOp(_op: FilterOp, _dataType?: DatasetFieldDataType): unknown[] {
  return []
}

export function normalizeFilterValue(op: FilterOp, value: unknown[] | undefined): unknown[] {
  const arity = valueArity(op)
  const raw = Array.isArray(value) ? [...value] : []
  if (arity === 'none')
    return []
  if (arity === 'one') {
    const cell = normalizeFilterCell(raw[0])
    return isBlankFilterCell(cell) ? [] : [cell]
  }
  if (arity === 'two') {
    const start = normalizeFilterCell(raw[0])
    const end = normalizeFilterCell(raw[1])
    if (isBlankFilterCell(start) && isBlankFilterCell(end))
      return []
    return [isBlankFilterCell(start) ? undefined : start, isBlankFilterCell(end) ? undefined : end]
  }
  return raw.map(normalizeFilterCell).filter(v => !isBlankFilterCell(v))
}

export function formatFilterValueSummary(op: FilterOp, value: unknown[] | undefined): string {
  const arity = valueArity(op)
  const vals = value ?? []
  if (arity === 'none')
    return ''
  if (arity === 'two')
    return `${vals[0] ?? ''} ~ ${vals[1] ?? ''}`
  if (arity === 'many')
    return vals.length ? vals.join(', ') : ''
  return String(vals[0] ?? '')
}

/** 保存前规范化 FilterItem（去掉 label，规整 value；日期快捷走 valueExp） */
export function normalizeFilterItemForSave(item: VIS.FilterItem): VIS.FilterItem {
  if (item.valueExp) {
    const next: VIS.FilterItem = { field: item.field, valueExp: item.valueExp }
    const value = normalizeDateExpValue(item.valueExp, item.value as unknown[])
      .map(normalizeFilterCell)
      .filter(v => !isBlankFilterCell(v))
    if (value.length)
      next.value = value as VIS.FilterItem['value']
    return next
  }
  const op = item.op ?? 'eq'
  const next: VIS.FilterItem = { field: item.field, op }
  const value = normalizeFilterValue(op, item.value as unknown[])
  if (value.length)
    next.value = value as VIS.FilterItem['value']
  return next
}

export function normalizeHavingItemForSave(item: VIS.HavingFilterItem): VIS.HavingFilterItem {
  const op = item.op ?? 'eq'
  const next: VIS.HavingFilterItem = { field: item.field, agg: item.agg, op }
  const value = normalizeFilterValue(op, item.value as unknown[])
  if (value.length)
    next.value = value as VIS.HavingFilterItem['value']
  return next
}

/** FieldPill popover 里编辑中的条件草稿 */
export interface FilterConditionDraft {
  mode: 'op' | 'exp'
  op: FilterOp
  valueExp: VIS.FilterItem['valueExp']
  value: unknown[]
}

export function toFilterConditionDraft(
  item: { op?: FilterOp, valueExp?: VIS.FilterItem['valueExp'], value?: unknown[] },
  dataType?: DatasetFieldDataType,
): FilterConditionDraft {
  return {
    mode: item.valueExp ? 'exp' : 'op',
    op: (item.op && opsForDataType(dataType).includes(item.op)
      ? item.op
      : opsForDataType(dataType)[0] || 'eq') as FilterOp,
    valueExp: item.valueExp || 'current_month',
    value: Array.isArray(item.value) ? [...item.value] : [],
  }
}

export function applyFilterConditionDraft(
  item: { op?: FilterOp, valueExp?: VIS.FilterItem['valueExp'], value?: unknown[] },
  draft: FilterConditionDraft,
  dataType?: DatasetFieldDataType,
) {
  if (isDateField(dataType) && draft.mode === 'exp' && draft.valueExp) {
    delete item.op
    item.valueExp = draft.valueExp
    item.value = [...draft.value]
    return
  }
  delete item.valueExp
  item.op = draft.op
  item.value = [...draft.value]
}

export function formatFilterConditionTip(item: {
  op?: FilterOp
  valueExp?: VIS.FilterItem['valueExp']
  value?: unknown[]
}) {
  if (item.valueExp)
    return formatDateValueExpLabel(item.valueExp, item.value)
  const op = item.op ?? 'eq'
  const opText = filterOpLabel(op)
  if (!needsFilterValue(op))
    return opText
  const summary = formatFilterValueSummary(op, item.value)
  return summary ? `${opText} ${summary}` : opText
}
