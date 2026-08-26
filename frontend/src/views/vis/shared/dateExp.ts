/** 日期快捷 valueExp（与后端 DateValueExpEnum 对齐） */

export type DateValueExp = NonNullable<VIS.FilterItem['valueExp']>

export interface DateValueExpOption {
  label: string
  value: DateValueExp
  valueCount: number
  /** 下拉补充：本周/本月/本年是起始日～当天，其余完整自然周期 */
  hint: string
}

export const DATE_VALUE_EXP_OPTIONS: DateValueExpOption[] = [
  { label: '今天', value: 'current_day', valueCount: 0, hint: '当天' },
  { label: '昨天', value: 'last_day', valueCount: 0, hint: '昨天一整天' },
  { label: '最近 N 天', value: 'last_days', valueCount: 1, hint: '含今天，往回 N 天' },
  { label: '最近 X–Y 天', value: 'last_xy_days', valueCount: 2, hint: '距今 X 天前～Y 天前，X > Y' },
  { label: '本周至今', value: 'current_week', valueCount: 0, hint: '本周一～当天' },
  { label: '上周', value: 'last_week', valueCount: 0, hint: '上周一～周日' },
  { label: '本月至今', value: 'current_month', valueCount: 0, hint: '本月 1 日～当天' },
  { label: '上月', value: 'last_month', valueCount: 0, hint: '上月整月' },
  { label: '今年至今', value: 'current_year', valueCount: 0, hint: '今年 1 月 1 日～当天' },
  { label: '去年', value: 'last_year', valueCount: 0, hint: '去年整年' },
]

export function dateValueExpCount(exp?: string): number {
  return DATE_VALUE_EXP_OPTIONS.find(item => item.value === exp)?.valueCount ?? 0
}

export function dateValueExpLabel(exp?: string): string {
  return DATE_VALUE_EXP_OPTIONS.find(item => item.value === exp)?.label || exp || ''
}

export function dateValueExpHint(exp?: string): string {
  return DATE_VALUE_EXP_OPTIONS.find(item => item.value === exp)?.hint || ''
}

function isFilledNumber(value: unknown) {
  return isFilled(value) && Number.isFinite(Number(value))
}

/** 参数未齐或 last_xy_days 的 X ≤ Y 时返回说明 */
export function dateExpValueError(exp?: string, value?: unknown[]): string {
  if (exp !== 'last_xy_days')
    return ''
  const raw = Array.isArray(value) ? value : []
  if (!isFilledNumber(raw[0]) || !isFilledNumber(raw[1]))
    return ''
  if (Number(raw[0]) <= Number(raw[1]))
    return 'X 需大于 Y（前大后小）'
  return ''
}

export function isDateExpReady(exp?: string, value?: unknown[]): boolean {
  if (!exp)
    return false
  const count = dateValueExpCount(exp)
  const raw = Array.isArray(value) ? value : []
  if (count <= 0)
    return true
  if (exp === 'last_days')
    return isFilledNumber(raw[0]) && Number(raw[0]) >= 1
  if (exp === 'last_xy_days') {
    return isFilledNumber(raw[0]) && isFilledNumber(raw[1])
      && Number(raw[0]) > Number(raw[1])
      && Number(raw[1]) >= 0
  }
  return false
}

function isFilled(v: unknown) {
  return v != null && v !== ''
}

/** 筛选/参数胶囊说明：把 N、X、Y 换成实际天数 */
export function formatDateValueExpLabel(exp?: string, value?: unknown[]): string {
  const vals = Array.isArray(value) ? value : []
  if (exp === 'last_days' && isFilled(vals[0]))
    return `最近${vals[0]}天`
  if (exp === 'last_xy_days' && isFilled(vals[0]) && isFilled(vals[1]))
    return `最近${vals[0]}-${vals[1]}天`
  return dateValueExpLabel(exp)
}

export function defaultDateExpValue(exp?: string): unknown[] {
  const count = dateValueExpCount(exp)
  if (count <= 0)
    return []
  return Array.from({ length: count }).fill(undefined)
}

export function normalizeDateExpValue(exp: string | undefined, value: unknown[] | undefined): unknown[] {
  const count = dateValueExpCount(exp)
  const raw = Array.isArray(value) ? [...value] : []
  if (count <= 0)
    return []
  return Array.from({ length: count }, (_, i) => raw[i])
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseAsOfDate(raw?: string) {
  const text = raw?.trim() ?? ''
  const hit = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (hit)
    return new Date(Number(hit[1]), Number(hit[2]) - 1, Number(hit[3]))
  return startOfLocalDay(new Date())
}

function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** 周一为一周起始，与后端 DateValueExpResolver 一致 */
function mondayOnOrBefore(d: Date) {
  const dow = d.getDay()
  return addDays(d, dow === 0 ? -6 : 1 - dow)
}

function toInt(raw: unknown) {
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim())
  return Number.isFinite(n) ? Math.trunc(n) : NaN
}

/**
 * 日期快捷 → 闭区间 [start, end]（yyyy-MM-dd）。
 * 与后端 DateValueExpResolver 对齐；参数不齐时返回 null。
 */
export function resolveDateValueWindow(
  exp: string | undefined,
  value?: unknown[],
  asOfDate?: string,
): [string, string] | null {
  if (!isDateExpReady(exp, value))
    return null
  const today = parseAsOfDate(asOfDate)
  const vals = Array.isArray(value) ? value : []
  let start = today
  let end = today
  switch (exp) {
    case 'current_day':
      break
    case 'last_day':
      start = addDays(today, -1)
      end = start
      break
    case 'last_days': {
      const n = toInt(vals[0])
      if (n < 1)
        return null
      start = addDays(today, -(n - 1))
      end = today
      break
    }
    case 'last_xy_days': {
      const x = toInt(vals[0])
      const y = toInt(vals[1])
      if (x < 1 || y < 0 || x <= y)
        return null
      start = addDays(today, -x)
      end = addDays(today, -y)
      break
    }
    case 'current_week':
      start = mondayOnOrBefore(today)
      end = today
      break
    case 'last_week': {
      start = addDays(mondayOnOrBefore(today), -7)
      end = addDays(start, 6)
      break
    }
    case 'current_month':
      start = new Date(today.getFullYear(), today.getMonth(), 1)
      end = today
      break
    case 'last_month': {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      end = new Date(today.getFullYear(), today.getMonth(), 0)
      break
    }
    case 'current_year':
      start = new Date(today.getFullYear(), 0, 1)
      end = today
      break
    case 'last_year':
      start = new Date(today.getFullYear() - 1, 0, 1)
      end = new Date(today.getFullYear() - 1, 11, 31)
      break
    default:
      return null
  }
  return [isoDate(start), isoDate(end)]
}
