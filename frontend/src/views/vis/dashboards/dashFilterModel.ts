import type { FilterOp } from '@/views/vis/shared/filterValue'
import type { DatasetFieldDataType, VisCard } from '@/views/vis/shared/types'
import dayjs from 'dayjs'
import { dateValueExpCount, formatDateValueExpLabel, isDateExpReady, normalizeDateExpValue } from '@/views/vis/shared/dateExp'
import { filterOpLabel, formatFilterValueSummary, incompleteFilterMessage, normalizeFilterItemForSave, normalizeParamItemForSave } from '@/views/vis/shared/filterValue'
import { isDateField } from '@/views/vis/shared/types'

export type DashFilterFormType
  = | 'input'
    | 'inputTag'
    | 'select'
    | 'multiSelect'
    | 'number'
    | 'numberRange'
    | 'date'
    | 'dateRange'
    | 'datetime'
    | 'datetimeRange'
    | 'dateExp'

export type DashFilterApplyAs = 'param' | 'filter'
export type DashFilterValueAs = 'string' | 'timestamp'
export type DashFilterOptionSource = 'manual' | 'dataset'

export interface DashFilterOptionItem {
  label: string
  value: string
}

export interface DashFilterOptions {
  source: DashFilterOptionSource
  items?: Array<string | DashFilterOptionItem>
  datasetId?: string
  field?: string
  labelField?: string
}

export interface VisDashFilterDef {
  uid: string
  datasetId: string
  field: string
  label: string
  applyAs: DashFilterApplyAs
  formType: DashFilterFormType
  op?: FilterOp
  valueAs?: DashFilterValueAs
  options?: DashFilterOptions
  defaultValue?: DashFilterValue
}

export interface DashFilterValue {
  value?: unknown[]
  valueExp?: VIS.FilterItem['valueExp']
}

export type DashFilterValues = Record<string, DashFilterValue>

export interface DashCardGlobals {
  globalFilters?: VIS.FilterItem[]
  globalParams?: VIS.FilterItem[]
}

export const FORM_TYPE_OPTIONS: Array<{ label: string, value: DashFilterFormType }> = [
  { label: '文本', value: 'input' },
  { label: '文本tag', value: 'inputTag' },
  { label: '下拉单选', value: 'select' },
  { label: '下拉多选', value: 'multiSelect' },
  { label: '数字', value: 'number' },
  { label: '数字范围', value: 'numberRange' },
  { label: '日期', value: 'date' },
  { label: '日期范围', value: 'dateRange' },
  { label: '日期时间', value: 'datetime' },
  { label: '日期时间范围', value: 'datetimeRange' },
  { label: '日期快捷', value: 'dateExp' },
]

const FORM_TYPE_SET = new Set<string>(FORM_TYPE_OPTIONS.map(item => item.value))

export function formTypeLabel(formType?: string) {
  return FORM_TYPE_OPTIONS.find(item => item.value === formType)?.label || formType || ''
}

export function needsOptions(formType?: DashFilterFormType) {
  return formType === 'select' || formType === 'multiSelect'
}

export function isTemporalFormType(formType?: DashFilterFormType) {
  return formType === 'date' || formType === 'dateRange'
    || formType === 'datetime' || formType === 'datetimeRange'
}

export function isDateTimeFormType(formType?: DashFilterFormType) {
  return formType === 'datetime' || formType === 'datetimeRange'
}

export function isRangeFormType(formType?: DashFilterFormType) {
  return formType === 'numberRange' || formType === 'dateRange' || formType === 'datetimeRange'
}

export function createFilterUid() {
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function asText(value: unknown) {
  return value == null ? '' : String(value).trim()
}

function coerceFormType(raw: unknown): DashFilterFormType {
  return typeof raw === 'string' && FORM_TYPE_SET.has(raw) ? raw as DashFilterFormType : 'input'
}

function normalizeOptionItem(raw: unknown): DashFilterOptionItem | null {
  if (typeof raw === 'string') {
    const value = raw.trim()
    return value ? { label: value, value } : null
  }
  if (!raw || typeof raw !== 'object')
    return null
  const row = raw as Partial<DashFilterOptionItem>
  const value = asText(row.value) || asText(row.label)
  if (!value)
    return null
  return { label: asText(row.label) || value, value }
}

export function resolveManualOptions(options?: DashFilterOptions): DashFilterOptionItem[] {
  if (!options || options.source === 'dataset')
    return []
  const items: DashFilterOptionItem[] = []
  const seen = new Set<string>()
  for (const raw of options.items ?? []) {
    const item = normalizeOptionItem(raw)
    if (!item || seen.has(item.value))
      continue
    seen.add(item.value)
    items.push(item)
  }
  return items
}

function normalizeOptions(raw: unknown): DashFilterOptions | undefined {
  if (!raw || typeof raw !== 'object')
    return undefined
  const row = raw as Partial<DashFilterOptions>
  if (row.source === 'dataset') {
    const datasetId = asText(row.datasetId)
    const field = asText(row.field)
    const labelField = asText(row.labelField)
    return {
      source: 'dataset',
      ...(datasetId ? { datasetId } : {}),
      ...(field ? { field } : {}),
      ...(labelField ? { labelField } : {}),
    }
  }
  if (row.source === 'manual')
    return { source: 'manual', items: resolveManualOptions({ source: 'manual', items: row.items }) }
  return undefined
}

export function normalizeFilterDef(row: Partial<VisDashFilterDef>): VisDashFilterDef {
  let formType = coerceFormType(row.formType)
  const options = normalizeOptions(row.options)
  if (formType === 'multiSelect' && row.options == null)
    formType = 'inputTag'
  if (formType === 'date' && row.op === 'between')
    formType = 'dateRange'
  if (formType === 'number' && row.op === 'between')
    formType = 'numberRange'
  if (formType === 'datetime' && row.op === 'between')
    formType = 'datetimeRange'
  const def: VisDashFilterDef = {
    uid: asText(row.uid),
    datasetId: asText(row.datasetId),
    field: asText(row.field),
    label: asText(row.label) || asText(row.field),
    applyAs: row.applyAs === 'param' ? 'param' : 'filter',
    formType,
  }
  const op = resolveFilterOp({ formType, op: row.op, applyAs: def.applyAs })
  if (op)
    def.op = op
  if (isTemporalFormType(formType) && row.valueAs === 'timestamp')
    def.valueAs = 'timestamp'
  if (needsOptions(formType))
    def.options = options ?? { source: 'manual', items: [] }
  const defaultValue = normalizeStoredValue(def, row.defaultValue)
  if (defaultValue)
    def.defaultValue = defaultValue
  return def
}

export function persistFilterDef(def: VisDashFilterDef): VisDashFilterDef {
  return normalizeFilterDef(def)
}

export function cloneFilterDefs(list: VisDashFilterDef[]): VisDashFilterDef[] {
  return list.map(item => ({
    ...item,
    defaultValue: item.defaultValue ? snapshotFilterValue(item.defaultValue) : undefined,
    options: item.options
      ? {
          ...item.options,
          items: item.options.items?.map(entry => (
            typeof entry === 'string' ? entry : { ...entry }
          )),
        }
      : undefined,
  }))
}

export function createEmptyFilterDef(): VisDashFilterDef {
  return {
    uid: createFilterUid(),
    datasetId: '',
    field: '',
    label: '',
    applyAs: 'filter',
    formType: 'input',
    op: 'eq',
  }
}

export function defaultFormType(dataType?: DatasetFieldDataType): DashFilterFormType {
  if (dataType === 'number')
    return 'number'
  if (dataType === 'timestamp')
    return 'datetime'
  if (isDateField(dataType))
    return 'dateExp'
  return 'input'
}

export function needsFilterOp(def: Pick<VisDashFilterDef, 'formType' | 'applyAs'>) {
  if (def.applyAs === 'param' || def.formType === 'dateExp' || isRangeFormType(def.formType))
    return false
  return opsForFormType(def.formType).length > 0
}

export function opsForFormType(formType: DashFilterFormType): FilterOp[] {
  switch (formType) {
    case 'inputTag':
    case 'multiSelect':
      return ['in', 'not_in']
    case 'select':
      return ['eq', 'ne']
    case 'number':
    case 'date':
    case 'datetime':
      return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte']
    case 'numberRange':
    case 'dateRange':
    case 'datetimeRange':
      return ['between']
    case 'dateExp':
      return []
    case 'input':
    default:
      return ['eq', 'ne', 'like', 'not_like']
  }
}

export function defaultFilterOp(formType: DashFilterFormType): FilterOp | undefined {
  const ops = opsForFormType(formType)
  if (!ops.length)
    return undefined
  if (formType === 'inputTag' || formType === 'multiSelect')
    return 'in'
  if (isRangeFormType(formType))
    return 'between'
  return 'eq'
}

export function resolveFilterOp(def: Pick<VisDashFilterDef, 'formType' | 'op' | 'applyAs'>): FilterOp | undefined {
  if (def.formType === 'dateExp' || def.applyAs === 'param')
    return undefined
  const allowed = opsForFormType(def.formType)
  return def.op && allowed.includes(def.op) ? def.op : defaultFilterOp(def.formType)
}

export function suggestApplyAs(datasetId: string, field: string, cards: VisCard[]): DashFilterApplyAs {
  const hit = cards.some((card) => {
    if (String(card.query.datasetId || '') !== String(datasetId))
      return false
    return (card.query.params ?? []).some(item => item.field === field)
  })
  return hit ? 'param' : 'filter'
}

function filledValues(value?: unknown[]) {
  return (Array.isArray(value) ? value : []).filter(v => v != null && String(v) !== '')
}

export const EMPTY_FILTER_VALUE: DashFilterValue = Object.freeze({ value: [] })

export function snapshotFilterValue(item?: DashFilterValue): DashFilterValue {
  return {
    value: Array.isArray(item?.value) ? [...item.value] : [],
    valueExp: item?.valueExp,
  }
}

export function isBlankFilterValue(item: DashFilterValue) {
  return filledValues(item.value).length === 0 && !item.valueExp
}

export function filterValueSig(item?: DashFilterValue) {
  return JSON.stringify({
    value: item?.value ?? [],
    valueExp: item?.valueExp ?? null,
  })
}

export function filterValueReady(def: VisDashFilterDef, raw?: DashFilterValue) {
  if (def.formType === 'dateExp')
    return isDateExpReady(raw?.valueExp, raw?.value)
  return !incompleteFilterMessage({
    op: resolveFilterOp(def),
    value: raw?.value,
  })
}

function normalizeStoredValue(def: VisDashFilterDef, raw: unknown): DashFilterValue | undefined {
  if (!raw || typeof raw !== 'object')
    return undefined
  const snap = snapshotFilterValue(raw as DashFilterValue)
  return filterValueReady(def, snap) ? snap : undefined
}

export function isRemoteFilterOptions(def: Pick<VisDashFilterDef, 'formType' | 'options'>) {
  return needsOptions(def.formType)
    && def.options?.source === 'dataset'
    && Boolean(def.options.datasetId)
    && Boolean(def.options.field)
}

export function applyFilterDefaults(
  defs: VisDashFilterDef[],
  current: DashFilterValues,
  prevUids?: Iterable<string>,
): DashFilterValues {
  const keep = new Set(defs.map(item => item.uid))
  const prev = new Set(prevUids ?? [])
  const next: DashFilterValues = {}
  for (const [uid, item] of Object.entries(current)) {
    if (keep.has(uid))
      next[uid] = snapshotFilterValue(item)
  }
  for (const def of defs) {
    if (def.uid in next)
      continue
    if (prev.size && prev.has(def.uid))
      continue
    if (filterValueReady(def, def.defaultValue))
      next[def.uid] = snapshotFilterValue(def.defaultValue)
  }
  return next
}

export function applyFilterDefaultsFromSettings(
  nextDefs: VisDashFilterDef[],
  prevDefs: VisDashFilterDef[],
  current: DashFilterValues,
): DashFilterValues {
  const next = applyFilterDefaults(nextDefs, current, prevDefs.map(item => item.uid))
  const prevDefault = new Map(prevDefs.map(item => [item.uid, filterValueSig(item.defaultValue)]))
  for (const def of nextDefs) {
    if (def.uid in next || !filterValueReady(def, def.defaultValue))
      continue
    if (filterValueSig(def.defaultValue) === (prevDefault.get(def.uid) ?? filterValueSig()))
      continue
    next[def.uid] = snapshotFilterValue(def.defaultValue)
  }
  return next
}

export function temporalDisplayFormat(def: Pick<VisDashFilterDef, 'formType'>) {
  return isDateTimeFormType(def.formType) ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'
}

export function formatDashTemporal(def: Pick<VisDashFilterDef, 'formType' | 'valueAs'>, raw: unknown) {
  if (raw == null || raw === '')
    return ''
  if (def.valueAs === 'timestamp') {
    const n = Number(raw)
    if (!Number.isFinite(n))
      return String(raw)
    return dayjs(n).format(temporalDisplayFormat(def))
  }
  return String(raw)
}

export function optionLabelOf(def: VisDashFilterDef, raw: unknown, extra?: Record<string, string>) {
  const value = String(raw ?? '')
  if (extra?.[value])
    return extra[value]
  const hit = resolveManualOptions(def.options).find(item => item.value === value)
  return hit?.label || value
}

function formatChipCells(def: VisDashFilterDef, values: unknown[], labels?: Record<string, string>) {
  const cells = values.map((item) => {
    if (isTemporalFormType(def.formType))
      return formatDashTemporal(def, item)
    if (needsOptions(def.formType))
      return optionLabelOf(def, item, labels)
    return String(item)
  })
  return cells.filter(Boolean).join('、')
}

export function dashFilterOpText(def: VisDashFilterDef) {
  if (def.formType === 'dateExp')
    return '等于'
  const op = resolveFilterOp(def)
  return op ? filterOpLabel(op) : ''
}

export function dashFilterChipText(def: VisDashFilterDef, raw?: DashFilterValue, labels?: Record<string, string>) {
  if (!filterValueReady(def, raw))
    return '-'
  if (def.formType === 'dateExp')
    return formatDateValueExpLabel(raw?.valueExp, raw?.value) || '-'
  const values = filledValues(raw?.value)
  if (resolveFilterOp(def) === 'between') {
    const start = formatDashTemporal(def, values[0]) || String(values[0] ?? '')
    const end = formatDashTemporal(def, values[1]) || String(values[1] ?? '')
    return start || end ? `${start} ~ ${end}` : '-'
  }
  return formatChipCells(def, values, labels) || formatFilterValueSummary(resolveFilterOp(def) || 'eq', values) || '-'
}

function toRuntimeValues(def: VisDashFilterDef, values: unknown[]) {
  if (def.valueAs !== 'timestamp')
    return values
  return values.map((raw) => {
    if (typeof raw === 'number' && Number.isFinite(raw))
      return raw
    const n = Number(raw)
    if (Number.isFinite(n) && String(raw).trim() !== '' && !String(raw).includes('-'))
      return n
    const parsed = dayjs(String(raw))
    return parsed.isValid() ? parsed.valueOf() : raw
  })
}

export function toRuntimeFilterItem(def: VisDashFilterDef, raw?: DashFilterValue): VIS.FilterItem | null {
  if (!filterValueReady(def, raw))
    return null
  const field = def.field.trim()
  if (!field)
    return null
  if (def.formType === 'dateExp') {
    const item: VIS.FilterItem = { field, valueExp: raw?.valueExp }
    const value = normalizeDateExpValue(raw?.valueExp, raw?.value)
    if (dateValueExpCount(raw?.valueExp) > 0 && value.length)
      item.value = value as VIS.FilterItem['value']
    if (def.label.trim())
      item.label = def.label.trim()
    return def.applyAs === 'param' ? normalizeParamItemForSave(item) : item
  }
  const op = resolveFilterOp(def)
  const item: VIS.FilterItem = { field }
  if (def.label.trim())
    item.label = def.label.trim()
  if (op)
    item.op = op
  const values = toRuntimeValues(def, filledValues(raw?.value))
  if (values.length)
    item.value = values as VIS.FilterItem['value']
  if (def.applyAs === 'param')
    return normalizeParamItemForSave(item)
  return normalizeFilterItemForSave(item)
}

export function globalsForCard(
  defs: VisDashFilterDef[],
  values: DashFilterValues,
  datasetId?: string,
): DashCardGlobals {
  if (!datasetId)
    return {}
  const globalFilters: VIS.FilterItem[] = []
  const globalParams: VIS.FilterItem[] = []
  for (const def of defs) {
    if (String(def.datasetId) !== String(datasetId))
      continue
    const item = toRuntimeFilterItem(def, values[def.uid])
    if (!item)
      continue
    if (def.applyAs === 'param')
      globalParams.push(item)
    else
      globalFilters.push(item)
  }
  const next: DashCardGlobals = {}
  if (globalFilters.length)
    next.globalFilters = globalFilters
  if (globalParams.length)
    next.globalParams = globalParams
  return next
}
