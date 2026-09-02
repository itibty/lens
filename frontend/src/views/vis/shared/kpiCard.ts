import type { VisKpiOptions, VisKpiPeriodMode, VisQueryConfig, VisVisualConfig } from './types'
import { resolveAccentByPaint } from './accentPresets'
import { resolveCardChrome } from './cardTheme'
import { formatFieldText, resolveMetricFormat } from './fieldStyle'
import { toFiniteNumber } from './numberStyle'
import {
  formatProgressPercent,
  isValidProgressTarget,
  PROGRESS_COLOR_PRESETS,
  progressColorPatch,
  progressColorPreview,
  progressMetricNames,
  progressSizeVars,
} from './progressCard'
import { dimensionAlias, isKpiChart, metricAlias, regularMetrics } from './types'

export type VisKpiSize = 'sm' | 'md' | 'lg'

const KPI_BAR_HEIGHT: Record<VisKpiSize, number> = {
  sm: 20,
  md: 32,
  lg: 48,
}

const KPI_BAR_PERCENT: Record<VisKpiSize, number> = {
  sm: 12,
  md: 15,
  lg: 18,
}

export const KPI_DEFAULTS = {
  showPercent: true,
  showValue: true,
  percentDecimals: 'auto',
  size: 'md',
} as const satisfies Required<
  Pick<VisKpiOptions, 'showPercent' | 'showValue' | 'percentDecimals' | 'size'>
>

export const KPI_SIZE_PRESETS: Array<{ id: VisKpiSize, name: string }> = [
  { id: 'sm', name: '小' },
  { id: 'md', name: '中' },
  { id: 'lg', name: '大' },
]

export function kpiWeightOf(size?: string): VisKpiSize {
  if (size === 'sm' || size === 'lg')
    return size
  return KPI_DEFAULTS.size
}

export function kpiPickerSize(size?: string) {
  return kpiWeightOf(size)
}

export const KPI_COLOR_PRESETS = PROGRESS_COLOR_PRESETS
export const kpiColorPatch = progressColorPatch
export const kpiColorPreview = progressColorPreview
export { progressMetricNames as kpiMetricNames }

export function kpiSizeSpec(item: { id: VisKpiSize }) {
  return [KPI_BAR_PERCENT[item.id], KPI_BAR_HEIGHT[item.id]]
}

export function kpiSizeVars(size?: string) {
  const id = kpiWeightOf(size)
  return {
    ...progressSizeVars(),
    '--vis-progress-bar': `${KPI_BAR_HEIGHT[id]}px`,
    '--vis-kpi-bar-percent': `${KPI_BAR_PERCENT[id]}px`,
  }
}

export const KPI_FEATURE_TIPS = {
  fixedTarget: '用此数当目标值，完成率 = 当前值 / 此数',
  period: '选了期限后按评估日画时间线，并在线旁标出时间进度',
  showValue: '显示当前值/目标值',
  percentDecimals: '完成率保留几位小数；自动时最多 1 位',
} as const

export const KPI_PERIOD_OPTIONS: Array<{ id: VisKpiPeriodMode, label: string }> = [
  { id: 'month', label: '本月' },
  { id: 'quarter', label: '本季' },
  { id: 'year', label: '本年' },
  { id: 'custom', label: '自定义' },
]

export interface ResolvedKpiOptions {
  showPercent: boolean
  showValue: boolean
  percentDecimals: NonNullable<VisKpiOptions['percentDecimals']>
  size: VisKpiSize
  color?: string
  trackColor?: string
  periodMode?: VisKpiPeriodMode
  periodStart?: string
  periodEnd?: string
}

export interface KpiRowView {
  key: string
  label: string
  record: Record<string, unknown>
  ratio: number
  fillRatio: number
  percentText: string
  currentText: string
  targetText: string
}

export interface KpiPaceView {
  ratio: number
  fillRatio: number
  percentText: string
  expired: boolean
}

export interface KpiView {
  rows: KpiRowView[]
  pace: KpiPaceView | null
}

export function resolveKpiColorPreset(visual?: VisVisualConfig) {
  return resolveAccentByPaint(visual?.kpi?.color, visual?.kpi?.trackColor)
}

export function resolveKpiPaint(visual?: VisVisualConfig) {
  const color = visual?.kpi?.color
  const track = visual?.kpi?.trackColor
  const cardColor = visual ? resolveCardChrome(visual).color : undefined
  const fill = color || 'var(--el-color-primary)'
  return {
    fill,
    fillGradient: `linear-gradient(to right, ${fill}, color-mix(in srgb, ${fill} 58%, #fff))`,
    track: track
      || (cardColor
        ? 'color-mix(in srgb, var(--vis-content-color) 18%, transparent)'
        : 'var(--el-fill-color)'),
  }
}

export function resolveKpiOptions(visual?: VisVisualConfig): ResolvedKpiOptions {
  const raw = visual?.kpi ?? {}
  return {
    showPercent: raw.showPercent ?? KPI_DEFAULTS.showPercent,
    showValue: raw.showValue ?? KPI_DEFAULTS.showValue,
    percentDecimals: raw.percentDecimals ?? KPI_DEFAULTS.percentDecimals,
    size: kpiWeightOf(raw.size),
    color: raw.color,
    trackColor: raw.trackColor,
    periodMode: raw.periodMode,
    periodStart: raw.periodStart,
    periodEnd: raw.periodEnd,
  }
}

export function pickKpiTarget(
  query: Pick<VisQueryConfig, 'metrics'>,
  row: Record<string, unknown>,
  visual?: VisVisualConfig,
) {
  const metric = regularMetrics(query.metrics)[1]
  if (metric) {
    const fromMetric = toFiniteNumber(row[metricAlias(metric)])
    if (isValidProgressTarget(fromMetric))
      return fromMetric
  }
  return isValidProgressTarget(visual?.kpi?.target) ? visual.kpi.target : null
}

export function hasKpiTarget(
  query: Pick<VisQueryConfig, 'metrics'>,
  visual?: VisVisualConfig,
) {
  return regularMetrics(query.metrics).length >= 2 || isValidProgressTarget(visual?.kpi?.target)
}

function parseDay(raw?: string) {
  const text = raw?.trim() ?? ''
  const hit = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!hit)
    return null
  return new Date(Number(hit[1]), Number(hit[2]) - 1, Number(hit[3]))
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function asOfDay(asOfDate?: string) {
  return parseDay(asOfDate) ?? startOfLocalDay(new Date())
}

function lastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0)
}

function dayUtc(d: Date) {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

export function resolveKpiPeriodWindow(
  opt: Pick<ResolvedKpiOptions, 'periodMode' | 'periodStart' | 'periodEnd'>,
  asOfDate?: string,
): [Date, Date] | null {
  const asOf = asOfDay(asOfDate)
  const y = asOf.getFullYear()
  const m = asOf.getMonth()
  if (opt.periodMode === 'month')
    return [new Date(y, m, 1), lastDayOfMonth(y, m)]
  if (opt.periodMode === 'quarter') {
    const q = Math.floor(m / 3) * 3
    return [new Date(y, q, 1), lastDayOfMonth(y, q + 2)]
  }
  if (opt.periodMode === 'year')
    return [new Date(y, 0, 1), new Date(y, 11, 31)]
  if (opt.periodMode === 'custom') {
    const start = parseDay(opt.periodStart)
    const end = parseDay(opt.periodEnd)
    if (!start || !end || dayUtc(end) < dayUtc(start))
      return null
    return [start, end]
  }
  return null
}

export function resolveKpiPace(
  opt: ResolvedKpiOptions,
  asOfDate?: string,
): { ratio: number, expired: boolean } | null {
  const window = resolveKpiPeriodWindow(opt, asOfDate)
  if (!window)
    return null
  const [start, end] = window
  const asOf = asOfDay(asOfDate)
  const span = dayUtc(end) - dayUtc(start)
  if (span <= 0)
    return { ratio: dayUtc(asOf) >= dayUtc(end) ? 1 : 0, expired: dayUtc(asOf) > dayUtc(end) }
  const raw = (dayUtc(asOf) - dayUtc(start)) / span
  return {
    ratio: Math.min(1, Math.max(0, raw)),
    expired: dayUtc(asOf) > dayUtc(end),
  }
}

export function resolveKpiView(
  query: VisQueryConfig,
  data: VIS.QueryDataResponse,
  visual?: VisVisualConfig,
): KpiView | null {
  const dim = query.dimensions?.[0]
  const currentMetric = regularMetrics(query.metrics)[0]
  if (!dim || !currentMetric)
    return null

  const opt = resolveKpiOptions(visual)
  const targetMetric = regularMetrics(query.metrics)[1]
  const currentFormat = resolveMetricFormat(visual, currentMetric)
  const targetFormat = resolveMetricFormat(visual, targetMetric ?? currentMetric)
  const currentKey = metricAlias(currentMetric)
  const dimKey = dimensionAlias(dim)
  const paceRaw = resolveKpiPace(opt, query.asOfDate)

  const parsed: Array<{
    record: Record<string, unknown>
    label: string
    current: number
    target: number
    ratio: number
  }> = []

  for (const [index, row] of (data.rows ?? []).entries()) {
    if (!row || typeof row !== 'object')
      continue
    const current = toFiniteNumber(row[currentKey] ?? row[currentMetric.field])
    const target = pickKpiTarget(query, row, visual)
    if (current == null || target == null)
      continue
    const rawLabel = row[dimKey] ?? row[dim.field]
    parsed.push({
      record: row,
      label: rawLabel == null || rawLabel === '' ? '(空)' : String(rawLabel),
      current,
      target,
      ratio: current / target,
    })
    if (index > 80)
      break
  }

  if (!parsed.length)
    return null

  const scale = Math.max(1, paceRaw?.ratio ?? 0, ...parsed.map(item => item.ratio))
  const pace = paceRaw
    ? {
        ratio: paceRaw.ratio,
        fillRatio: paceRaw.ratio / scale,
        percentText: formatProgressPercent(paceRaw.ratio, opt.percentDecimals),
        expired: paceRaw.expired,
      }
    : null

  return {
    pace,
    rows: parsed.map((item, index) => ({
      key: `${item.label}-${index}`,
      label: item.label,
      record: item.record,
      ratio: item.ratio,
      fillRatio: item.ratio / scale,
      percentText: formatProgressPercent(item.ratio, opt.percentDecimals),
      currentText: formatFieldText(item.current, currentFormat),
      targetText: formatFieldText(item.target, targetFormat),
    })),
  }
}

export function pruneKpiVisual(visual: VisVisualConfig) {
  if (!isKpiChart(visual.chartType)) {
    delete visual.kpi
    return visual
  }
  const raw = visual.kpi
  if (!raw)
    return visual
  delete raw.decimals
  delete raw.separator
  delete raw.prefix
  delete raw.suffix
  delete raw.compact
  if (!Object.keys(raw).length)
    delete visual.kpi
  return visual
}
