import type { DatasetField, DatasetFieldDataType } from './types'
import { opsForDataType } from './filterValue'
import { DEFAULT_METRIC_AGG } from './types'

/** 拖拽过程中的临时字段载荷（投放后按 shelf 规范化） */
export interface DragFieldPayload {
  _uid: string
  field: string
  dataType?: DatasetFieldDataType
  /** 已存在配置时可能带上 */
  label?: string
  agg?: VIS.MetricItem['agg']
  op?: VIS.FilterItem['op']
  value?: VIS.FilterItem['value']
}

export type DimensionPill = VIS.DimensionItem & { _uid: string }
export type MetricPill = VIS.MetricItem & { _uid: string }
export type FilterPill = VIS.FilterItem & { _uid: string }
export type ParamPill = VIS.FilterItem & { _uid: string }

export function createDragUid() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function cloneDatasetField(field: DatasetField): DragFieldPayload {
  return {
    _uid: createDragUid(),
    field: field.field,
    dataType: field.dataType,
  }
}

export function toDimensionPill(raw: DragFieldPayload | DimensionPill): DimensionPill {
  const existing = raw as DimensionPill
  const pill: DimensionPill = {
    _uid: raw._uid || createDragUid(),
    field: raw.field,
  }
  if (raw.label?.trim())
    pill.label = raw.label.trim()
  if (existing.timeGrain)
    pill.timeGrain = existing.timeGrain
  return pill
}

export function toMetricPill(raw: DragFieldPayload | MetricPill): MetricPill {
  const existing = raw as MetricPill
  const pill: MetricPill = {
    _uid: raw._uid || createDragUid(),
    field: raw.field,
  }
  if (existing.formula?.trim()) {
    pill.formula = existing.formula.trim()
  }
  else {
    pill.agg = existing.agg || DEFAULT_METRIC_AGG
  }
  if (raw.label?.trim())
    pill.label = raw.label.trim()
  return pill
}

export type OrderPill = VIS.OrderItem & {
  _uid: string
  /** 对应维度 / 指标胶囊，仅前端跟随改名，不落库 */
  sourceUid?: string
}
export type HavingPill = VIS.HavingFilterItem & { _uid: string }

export function normalizeMetricForSave(metric: VIS.MetricItem): VIS.MetricItem {
  const base: VIS.MetricItem = { field: metric.field }
  if (metric.label?.trim())
    base.label = metric.label.trim()
  if (metric.formula?.trim())
    base.formula = metric.formula.trim()
  else
    base.agg = metric.agg || DEFAULT_METRIC_AGG
  if (metric.contrast) {
    const contrast: VIS.ContrastConfig = {
      timeField: metric.contrast.timeField,
      calcMethod: metric.contrast.calcMethod,
      calcType: metric.contrast.calcType,
      valueExp: metric.contrast.valueExp,
    }
    if (metric.contrast.value?.length)
      contrast.value = metric.contrast.value
    base.contrast = contrast
  }
  return base
}

export function toParamPill(raw: DragFieldPayload | ParamPill): ParamPill {
  const existing = raw as ParamPill
  const pill: ParamPill = {
    _uid: raw._uid || createDragUid(),
    field: raw.field,
  }
  if (raw.label?.trim())
    pill.label = raw.label.trim()
  if (existing.valueExp)
    pill.valueExp = existing.valueExp
  if (existing.value)
    pill.value = existing.value
  return pill
}

export function toFilterPill(raw: DragFieldPayload | FilterPill): FilterPill {
  const dataType = ('dataType' in raw ? raw.dataType : undefined) || 'string'
  const allowed = opsForDataType(dataType)
  const op = (raw.op && allowed.includes(raw.op) ? raw.op : allowed[0]) || 'eq'
  const pill: FilterPill = {
    _uid: raw._uid || createDragUid(),
    field: raw.field,
    op,
  }
  if (raw.value?.length)
    pill.value = raw.value
  return pill
}

export function stripPillUid<T extends { _uid?: string }>(item: T): Omit<T, '_uid'> {
  const { _uid: _drop, ...rest } = item
  return rest
}

export const DND_GROUP = 'vis-query-fields'

export {
  FILTER_OPS,
  filterOpLabel,
  filterOpsForDataType,
  HAVING_OPS,
  needsFilterValue,
} from './filterValue'
