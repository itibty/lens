import type { VisAccentPresetId } from './accentPresets'
import type { VisProgressOptions, VisProgressShape, VisQueryConfig, VisVisualConfig } from './types'
import { accentPreview, findAccentPreset, resolveAccentByPaint, VIS_ACCENT_PRESETS } from './accentPresets'
import { scaleFitPx } from './cardFit'
import { resolveCardChrome } from './cardTheme'
import { formatFieldText, resolveMetricFormat } from './fieldStyle'
import { toFiniteNumber } from './numberStyle'
import { isProgressChart, metricAlias, regularMetrics } from './types'

/** 默认值、配色、解析、视图；表单只写差异，渲染侧在此填默认。 */

export const PROGRESS_DEFAULTS = {
  shape: 'bar',
  showPercent: true,
  showValue: true,
  showLabel: false,
  percentDecimals: 'auto',
} as const satisfies Required<
  Pick<VisProgressOptions, 'shape' | 'showPercent' | 'showValue' | 'showLabel' | 'percentDecimals'>
>

/** 进度条配色（填充 / 轨道）；默认不落库 */
export const PROGRESS_COLOR_PRESETS = VIS_ACCENT_PRESETS
export type VisProgressColorPresetId = VisAccentPresetId

export const PROGRESS_FEATURE_TIPS = {
  fixedTarget: '用此数当目标值，完成率 = 当前值 / 此数',
  showValue: '显示当前值/目标值',
  percentDecimals: '完成率保留几位小数；自动时最多 1 位',
} as const

export function isProgressArc(shape?: VisProgressShape) {
  return shape === 'ring' || shape === 'gauge'
}

export function resolveProgressShape(shape?: string): VisProgressShape {
  if (shape === 'ring' || shape === 'gauge')
    return shape
  return PROGRESS_DEFAULTS.shape
}

/** 未铺满时的参考环径；铺满时由 fit 覆盖 */
export const PROGRESS_RING_REF = 120

/** 字号只跟格子走 */
export const PROGRESS_TYPE = {
  labelSize: 13,
  percent: 22,
  ringPercent: 20,
  values: 14,
  gap: 6,
} as const

export const PROGRESS_RING_PERCENT_RATIO = PROGRESS_TYPE.ringPercent / PROGRESS_RING_REF

/** 默认条高 / 环宽比；铺满时再乘 fit */
export const PROGRESS_WEIGHT = {
  barHeight: 10,
  ringStrokeRatio: 0.083,
} as const

export interface ResolvedProgressOptions {
  shape: VisProgressShape
  showPercent: boolean
  showValue: boolean
  showLabel: boolean
  percentDecimals: NonNullable<VisProgressOptions['percentDecimals']>
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

/* —— 默认粗细 / 配色解析 —— */

export function progressSizeVars(scale = 1) {
  const px = (n: number) => `${scaleFitPx(n, scale)}px`
  return {
    '--vis-progress-gap': px(PROGRESS_TYPE.gap),
    '--vis-progress-label': px(PROGRESS_TYPE.labelSize),
    '--vis-progress-percent': px(PROGRESS_TYPE.percent),
    '--vis-progress-ring-percent': px(PROGRESS_TYPE.ringPercent),
    '--vis-progress-values': px(PROGRESS_TYPE.values),
    '--vis-progress-bar': px(PROGRESS_WEIGHT.barHeight),
  }
}

/** 大半环：约 200° 上沿马蹄，缺口居中朝下；圆角端点各伸出约半个线宽 */
export const PROGRESS_GAUGE_SWEEP = 200
export const PROGRESS_GAUGE_START = 90 + (360 - PROGRESS_GAUGE_SWEEP) / 2

export interface ProgressRingGeom {
  size: number
  width: number
  height: number
  stroke: number
  radius: number
  circ: number
  arc: number
  gap: number
  cx: number
  startDeg: number
  viewBox: string
  trackDash?: string
  fillDash: string
  isGauge: boolean
  /** 圆心在 SVG 高度中的比例，大半环百分比定位用 */
  cyRatio: number
}

function ringViewBox(box: number, height: number, padX: number, padTop: number, padBottom: number) {
  const vbX = -padX
  const vbY = -padTop
  const vbW = box + padX * 2
  const vbH = height + padTop + padBottom
  return {
    width: vbW,
    height: vbH,
    viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
    cyRatio: (box / 2 + padTop) / vbH,
  }
}

export function progressRingGeom(
  shape: VisProgressShape = 'ring',
  renderSize?: number,
): ProgressRingGeom {
  const box = renderSize && renderSize > 0 ? renderSize : PROGRESS_RING_REF
  const stroke = Math.max(2, Math.round(box * PROGRESS_WEIGHT.ringStrokeRatio * 10) / 10)
  const radius = Math.max(4, (box - stroke) / 2)
  const circ = 2 * Math.PI * radius
  const cx = box / 2
  const isGauge = shape === 'gauge'
  // 圆角端点半径为 stroke/2，四周再多留一线宽，避免被 viewBox 裁切
  const pad = stroke
  if (!isGauge) {
    const frame = ringViewBox(box, box, pad, pad, pad)
    return {
      size: box,
      width: frame.width,
      height: frame.height,
      stroke,
      radius,
      circ,
      arc: circ,
      gap: 0,
      cx,
      startDeg: -90,
      viewBox: frame.viewBox,
      fillDash: `${circ}`,
      isGauge: false,
      cyRatio: 0.5,
    }
  }
  const arc = circ * (PROGRESS_GAUGE_SWEEP / 360)
  const gap = circ - arc
  const endY = cx + radius * Math.sin((PROGRESS_GAUGE_START * Math.PI) / 180)
  const height = Math.min(box, Math.round((endY + pad) * 10) / 10)
  const frame = ringViewBox(box, height, pad, pad / 2, 0)
  return {
    size: box,
    width: frame.width,
    height: frame.height,
    stroke,
    radius,
    circ,
    arc,
    gap,
    cx,
    startDeg: PROGRESS_GAUGE_START,
    viewBox: frame.viewBox,
    trackDash: `${arc} ${circ}`,
    fillDash: `${arc} ${circ}`,
    isGauge: true,
    cyRatio: frame.cyRatio,
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
    shape: resolveProgressShape(raw.shape),
    showPercent: raw.showPercent ?? PROGRESS_DEFAULTS.showPercent,
    showValue: raw.showValue ?? PROGRESS_DEFAULTS.showValue,
    showLabel: raw.showLabel ?? PROGRESS_DEFAULTS.showLabel,
    percentDecimals: raw.percentDecimals ?? PROGRESS_DEFAULTS.percentDecimals,
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
  query?: Pick<VisQueryConfig, 'metrics'>,
): ProgressView {
  const opt = resolveProgressOptions(visual)
  const metrics = regularMetrics(query?.metrics)
  const currentFormat = resolveMetricFormat(visual, metrics[0])
  const targetFormat = resolveMetricFormat(visual, metrics[1] ?? metrics[0])
  const ratio = current / target

  return {
    current,
    target,
    ratio,
    fillRatio: Math.min(1, Math.max(0, ratio)),
    percentText: formatProgressPercent(ratio, opt.percentDecimals),
    currentText: formatFieldText(current, currentFormat),
    targetText: formatFieldText(target, targetFormat),
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
  return buildProgressView(current, target, pickProgressLabel(query), visual, query)
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
  if (!isProgressChart(visual.chartType)) {
    delete visual.progress
    return visual
  }
  const raw = visual.progress as (VisProgressOptions & { size?: unknown }) | undefined
  if (!raw)
    return visual
  delete raw.size
  delete raw.decimals
  delete raw.separator
  delete raw.prefix
  delete raw.suffix
  delete raw.compact
  if (!Object.keys(raw).length)
    delete visual.progress
  return visual
}
