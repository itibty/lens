import type { VisAccentPresetId } from './accentPresets'
import type { VisProgressOptions, VisProgressShape, VisProgressSize, VisQueryConfig, VisVisualConfig } from './types'
import { accentPreview, findAccentPreset, resolveAccentByPaint, VIS_ACCENT_PRESETS } from './accentPresets'
import { resolveCardChrome } from './cardTheme'
import { formatMetricNumber, toFiniteNumber } from './numberStyle'
import { isProgressChart, metricAlias, regularMetrics } from './types'

/** 默认值、配色、尺寸、解析、视图；表单只写差异，渲染侧在此填默认。 */

export const PROGRESS_DEFAULTS = {
  shape: 'bar',
  showPercent: true,
  showValue: true,
  showLabel: false,
  percentDecimals: 'auto',
  decimals: 'auto',
  separator: true,
  prefix: '',
  compact: false,
  size: 'md',
} as const satisfies Required<
  Pick<VisProgressOptions, 'shape' | 'showPercent' | 'showValue' | 'showLabel' | 'percentDecimals' | 'decimals' | 'separator' | 'prefix' | 'compact' | 'size'>
>

/** 进度条配色（填充 / 轨道）；默认不落库 */
export const PROGRESS_COLOR_PRESETS = VIS_ACCENT_PRESETS
export type VisProgressColorPresetId = VisAccentPresetId

export const PROGRESS_FEATURE_TIPS = {
  fixedTarget: '用此数当目标值，完成率 = 当前值 / 此数',
  showLabel: '显示在进度条上方，当前指标名',
  showPercentBar: '显示在进度条上方，完成比例',
  showPercentRing: '显示在环形圆心，完成比例',
  showValue: '显示在进度条下方，当前值/目标值',
  percentDecimals: '完成率保留几位小数；自动时最多 1 位',
} as const

export interface ProgressSizePreset {
  id: VisProgressSize
  name: string
  labelSize: number
  percent: number
  ringPercent: number
  values: number
  barHeight: number
  ring: number
  ringStroke: number
  gap: number
}

/** 完成率 / 目标值 / 指标名 / 条高 / 环径 */
export const PROGRESS_SIZE_PRESETS: ProgressSizePreset[] = [
  { id: 'xs', name: '极小', labelSize: 11, percent: 16, ringPercent: 14, values: 12, barHeight: 4, ring: 80, ringStroke: 6, gap: 4 },
  { id: 'sm', name: '小', labelSize: 12, percent: 18, ringPercent: 16, values: 13, barHeight: 6, ring: 96, ringStroke: 8, gap: 5 },
  { id: 'md', name: '中', labelSize: 13, percent: 22, ringPercent: 20, values: 14, barHeight: 10, ring: 120, ringStroke: 10, gap: 6 },
  { id: 'lg', name: '大', labelSize: 14, percent: 26, ringPercent: 24, values: 16, barHeight: 12, ring: 136, ringStroke: 12, gap: 8 },
  { id: 'xl', name: '极大', labelSize: 15, percent: 32, ringPercent: 28, values: 18, barHeight: 16, ring: 168, ringStroke: 14, gap: 10 },
]

const SIZE_MAP = Object.fromEntries(
  PROGRESS_SIZE_PRESETS.map(item => [item.id, item]),
) as Record<VisProgressSize, ProgressSizePreset>

export interface ResolvedProgressOptions {
  shape: VisProgressShape
  showPercent: boolean
  showValue: boolean
  showLabel: boolean
  percentDecimals: NonNullable<VisProgressOptions['percentDecimals']>
  decimals: NonNullable<VisProgressOptions['decimals']>
  separator: boolean
  prefix: string
  compact: boolean
  size: VisProgressSize
  color?: string
  trackColor?: string
}

export interface ProgressView {
  current: number
  target: number
  ratio: number
  fillRatio: number
  percentText: string
  currentText: string
  targetText: string
  label: string
}

/* —— 尺寸 / 配色解析 —— */

export function progressSizeOf(size?: string): ProgressSizePreset {
  if (size && size in SIZE_MAP)
    return SIZE_MAP[size as VisProgressSize]
  return SIZE_MAP[PROGRESS_DEFAULTS.size]
}

/** 选择条右侧：完成率 / 条高 */
export function progressSizeSpec(item: ProgressSizePreset) {
  return [item.percent, item.barHeight]
}

export function progressSizeVars(size?: string) {
  const s = progressSizeOf(size)
  return {
    '--vis-progress-gap': `${s.gap}px`,
    '--vis-progress-label': `${s.labelSize}px`,
    '--vis-progress-percent': `${s.percent}px`,
    '--vis-progress-ring-percent': `${s.ringPercent}px`,
    '--vis-progress-values': `${s.values}px`,
    '--vis-progress-bar': `${s.barHeight}px`,
    '--vis-progress-ring': `${s.ring}px`,
  }
}

export function progressRingGeom(size?: string) {
  const s = progressSizeOf(size)
  const radius = (s.ring - s.ringStroke) / 2
  return {
    size: s.ring,
    stroke: s.ringStroke,
    radius,
    circ: 2 * Math.PI * radius,
    cx: s.ring / 2,
  }
}

export function resolveProgressColorPreset(visual?: VisVisualConfig) {
  return resolveAccentByPaint(visual?.progress?.color, visual?.progress?.trackColor)
}

export function progressColorPatch(id: VisProgressColorPresetId) {
  const item = findAccentPreset(id)
  if (!item || item.id === 'default')
    return null
  return { color: item.color, trackColor: item.wash }
}

export function progressColorPreview(item: (typeof PROGRESS_COLOR_PRESETS)[number]) {
  return accentPreview(item)
}

export function resolveProgressPaint(visual?: VisVisualConfig) {
  const color = visual?.progress?.color
  const track = visual?.progress?.trackColor
  const cardColor = visual ? resolveCardChrome(visual).color : undefined
  return {
    fill: color || 'var(--el-color-primary)',
    track: track
      || (cardColor
        ? 'color-mix(in srgb, var(--vis-content-color) 16%, transparent)'
        : 'color-mix(in srgb, var(--el-color-primary) 10%, var(--el-fill-color-light))'),
  }
}

export function resolveProgressOptions(visual?: VisVisualConfig): ResolvedProgressOptions {
  const raw = visual?.progress ?? {}
  return {
    shape: raw.shape === 'ring' ? 'ring' : PROGRESS_DEFAULTS.shape,
    showPercent: raw.showPercent ?? PROGRESS_DEFAULTS.showPercent,
    showValue: raw.showValue ?? PROGRESS_DEFAULTS.showValue,
    showLabel: raw.showLabel ?? PROGRESS_DEFAULTS.showLabel,
    percentDecimals: raw.percentDecimals ?? PROGRESS_DEFAULTS.percentDecimals,
    decimals: raw.decimals ?? PROGRESS_DEFAULTS.decimals,
    separator: raw.separator ?? PROGRESS_DEFAULTS.separator,
    prefix: raw.prefix ?? PROGRESS_DEFAULTS.prefix,
    compact: raw.compact ?? PROGRESS_DEFAULTS.compact,
    size: progressSizeOf(raw.size).id,
    color: raw.color,
    trackColor: raw.trackColor,
  }
}

/* —— 指标 / 目标 —— */
export function progressMetricNames(query?: Pick<VisQueryConfig, 'metrics'>) {
  const metrics = regularMetrics(query?.metrics)
  const nameOf = (metric: VIS.MetricItem | undefined, fallback: string) =>
    metric ? metricAlias(metric) : fallback
  const current = nameOf(metrics[0], '第 1 个指标')
  const target = nameOf(metrics[1], '第 2 个指标')
  return {
    current,
    target,
    pair: `${current}/${target}`,
    hasMetricTarget: metrics.length >= 2,
  }
}

export function isValidProgressTarget(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function pickProgressCurrent(
  query: Pick<VisQueryConfig, 'metrics'>,
  data: VIS.QueryDataResponse,
) {
  const metric = regularMetrics(query.metrics)[0]
  if (!metric)
    return null
  return toFiniteNumber(data.rows?.[0]?.[metricAlias(metric)])
}

export function pickProgressTarget(
  query: Pick<VisQueryConfig, 'metrics'>,
  data: VIS.QueryDataResponse,
  visual?: VisVisualConfig,
) {
  const metric = regularMetrics(query.metrics)[1]
  if (metric) {
    const fromMetric = toFiniteNumber(data.rows?.[0]?.[metricAlias(metric)])
    if (isValidProgressTarget(fromMetric))
      return fromMetric
  }
  return isValidProgressTarget(visual?.progress?.target) ? visual.progress.target : null
}

export function pickProgressLabel(query: Pick<VisQueryConfig, 'metrics'>) {
  const metric = regularMetrics(query.metrics)[0]
  return metric?.label || metric?.field || '当前值'
}

export function hasProgressTarget(
  query: Pick<VisQueryConfig, 'metrics'>,
  visual?: VisVisualConfig,
) {
  return regularMetrics(query.metrics).length >= 2 || isValidProgressTarget(visual?.progress?.target)
}

/* —— 视图 / 落库 —— */
function buildProgressView(
  current: number,
  target: number,
  label: string,
  visual?: VisVisualConfig,
): ProgressView {
  const opt = resolveProgressOptions(visual)
  const style = {
    decimals: opt.decimals,
    separator: opt.separator,
    compact: opt.compact,
  }
  const prefix = opt.prefix.trim()
  const ratio = current / target

  function withPrefix(value: number) {
    const parts = formatMetricNumber(value, style)
    if (parts.empty)
      return '-'
    return `${prefix}${parts.body}${parts.compactSuffix}`
  }

  return {
    current,
    target,
    ratio,
    fillRatio: Math.min(1, Math.max(0, ratio)),
    percentText: formatProgressPercent(ratio, opt.percentDecimals),
    currentText: withPrefix(current),
    targetText: withPrefix(target),
    label,
  }
}

export function resolveProgressView(
  query: Pick<VisQueryConfig, 'metrics'>,
  data: VIS.QueryDataResponse,
  visual?: VisVisualConfig,
): ProgressView | null {
  const current = pickProgressCurrent(query, data)
  const target = pickProgressTarget(query, data, visual)
  if (current == null || target == null)
    return null
  return buildProgressView(current, target, pickProgressLabel(query), visual)
}

/** 文本卡静态进度：直接用写死的当前值 / 目标值 */
export function resolveProgressViewFromStatic(
  current: number,
  target: number,
  label?: string,
  visual?: VisVisualConfig,
): ProgressView | null {
  if (!Number.isFinite(current) || !isValidProgressTarget(target))
    return null
  return buildProgressView(current, target, label?.trim() || '当前值', visual)
}

export function formatProgressPercent(
  ratio: number,
  decimals: NonNullable<VisProgressOptions['percentDecimals']>,
) {
  const pct = ratio * 100
  if (!Number.isFinite(pct))
    return '-'
  const text = decimals === 'auto'
    ? new Intl.NumberFormat('zh-CN', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      }).format(pct)
    : new Intl.NumberFormat('zh-CN', {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      }).format(pct)
  return `${text}%`
}

export function pruneProgressVisual(visual: VisVisualConfig) {
  if (!isProgressChart(visual.chartType))
    delete visual.progress
  return visual
}
