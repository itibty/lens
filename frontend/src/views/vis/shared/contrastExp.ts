/** 同环比：评估期与平移的合法组合（对齐后端 ContrastWindowResolver.allowed） */

import { dateValueExpCount, formatDateValueExpLabel, isDateExpReady } from '@/views/vis/shared/dateExp'
import { metricAlias } from '@/views/vis/shared/types'

export type ContrastMethod = VIS.ContrastConfig['calcMethod']

function isFilledNumber(value: unknown) {
  if (value == null || value === '')
    return false
  return Number.isFinite(Number(value))
}

/** 最近 N 天 / X–Y 天为空时的默认天数 */
export function defaultContrastPeriodValue(exp?: string): unknown[] {
  if (exp === 'last_days')
    return [7]
  if (exp === 'last_xy_days')
    return [14, 7]
  return []
}

export function fillContrastPeriodValue(exp?: string, value?: unknown[]): unknown[] {
  const count = dateValueExpCount(exp)
  if (count <= 0)
    return []
  const fallback = defaultContrastPeriodValue(exp)
  const raw = Array.isArray(value) ? value : []
  return Array.from({ length: count }, (_, i) => (
    isFilledNumber(raw[i]) ? Number(raw[i]) : fallback[i]
  ))
}

/** 评估期对应的合法平移；第一项为环比默认 */
export function contrastMethodsForExp(exp?: string): ContrastMethod[] {
  switch (exp) {
    case 'current_day':
    case 'last_day':
      return ['shift_day', 'shift_week', 'shift_year']
    case 'current_week':
    case 'last_week':
      return ['shift_week', 'shift_year']
    case 'current_month':
    case 'last_month':
      return ['shift_month', 'shift_year']
    case 'current_year':
    case 'last_year':
      return ['shift_year']
    case 'last_days':
    case 'last_xy_days':
      return ['shift_period', 'shift_year']
    default:
      return ['shift_day', 'shift_week', 'shift_year']
  }
}

export function syncContrastMethod(
  exp: string | undefined,
  method: ContrastMethod | undefined,
): ContrastMethod {
  const allowed = contrastMethodsForExp(exp)
  if (method && allowed.includes(method))
    return method
  return allowed[0]
}

export function contrastMethodLabel(exp: string | undefined, method: ContrastMethod): string {
  const day = exp === 'current_day' || exp === 'last_day'

  if (method === 'shift_day')
    return '较前一日'
  if (method === 'shift_week') {
    if (day)
      return '较上周同日'
    if (exp === 'current_week')
      return '较上周同期'
    if (exp === 'last_week')
      return '较上一完整周'
    return '较上周'
  }
  if (method === 'shift_month') {
    if (exp === 'current_month')
      return '较上月同期'
    if (exp === 'last_month')
      return '较上一完整月'
    return '较上月'
  }
  if (method === 'shift_period')
    return '较再往前同样天数'
  if (method === 'shift_year') {
    if (day)
      return '较去年同日'
    if (exp === 'current_week' || exp === 'current_month' || exp === 'current_year')
      return '较去年同期'
    if (exp === 'last_week')
      return '较去年同一周'
    if (exp === 'last_month')
      return '较去年同月'
    if (exp === 'last_year')
      return '较前年全年'
    return '较去年同期'
  }
  return method
}

/** 区间预览请求；评估期参数不齐或组合非法时返回 null */
export function toDateWindowRequest(
  exp: string | undefined,
  value: unknown[] | undefined,
  method?: ContrastMethod,
): VIS.DateWindowRequest | null {
  if (!exp || !isDateExpReady(exp, value))
    return null
  const next: VIS.DateWindowRequest = {
    valueExp: exp as VIS.DateWindowRequest['valueExp'],
  }
  if (method)
    next.calcMethod = method
  if (dateValueExpCount(exp) > 0)
    next.value = (Array.isArray(value) ? value : []) as VIS.DateWindowRequest['value']
  return next
}

export function contrastMethodOptions(exp?: string): Array<{ label: string, value: ContrastMethod }> {
  return contrastMethodsForExp(exp).map(value => ({
    value,
    label: contrastMethodLabel(exp, value),
  }))
}

export function contrastResultLabel(calcType?: VIS.ContrastConfig['calcType']) {
  return calcType === 'diffRate' ? '差值率' : '差值'
}

export function findContrastInfo(data: VIS.QueryDataResponse | undefined, field: string) {
  return data?.contrasts?.find(item => item.label === field)
}

export function formatContrastRange(range?: VIS.ContrastRange) {
  if (!range?.start)
    return ''
  if (!range.end || range.start === range.end)
    return range.start
  return `${range.start}～${range.end}`
}

/** 响应里的评估期 / 对比期，给表头或悬停用 */
export function contrastPeriodDescription(info?: VIS.ContrastInfo) {
  if (!info)
    return ''
  const current = formatContrastRange(info.current)
  const compare = formatContrastRange(info.compare)
  if (current && compare)
    return `${current}\n对比\n${compare}`
  if (current)
    return current
  if (compare)
    return `对比\n${compare}`
  return ''
}

export function isDiffRateField(
  query: VIS.QueryConfig,
  field: string,
  data?: VIS.QueryDataResponse,
) {
  const metric = (query.metrics ?? []).find(item => metricAlias(item) === field)
  if (metric?.contrast?.calcType === 'diffRate')
    return true
  return data?.contrasts?.some(item => item.label === field && item.calcType === 'diffRate') ?? false
}

/** 差值 / 差值率基础展示；只格式化数值和正负号，不推断单位。 */
export function formatContrastValue(
  value: unknown,
  calcType?: VIS.ContrastConfig['calcType'],
) {
  if (value == null || value === '')
    return '-'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n))
    return String(value)
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  const body = new Intl.NumberFormat('zh-CN', {
    useGrouping: calcType !== 'diffRate',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Math.abs(n))
  return `${sign}${body}`
}

/** 自动显示名：字段 + 评估期 + 对比 + 结果 */
export function contrastDisplayLabel(
  exp: string | undefined,
  method: ContrastMethod,
  calcType?: VIS.ContrastConfig['calcType'],
  value?: unknown[],
  field?: string,
) {
  const period = formatDateValueExpLabel(exp, value)
  const compare = contrastMethodLabel(exp, method)
  const result = contrastResultLabel(calcType)
  return [field, period, compare, result]
    .filter(Boolean)
    .map(part => String(part).replace(/\s+/g, '_'))
    .join('_')
}
