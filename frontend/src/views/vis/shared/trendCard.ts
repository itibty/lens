import type { VisTrendOptions, VisVisualConfig } from './types'
import { FIELD_FORMAT_DEFAULTS, formatFieldText, formatMetricField, resolveMetricFormat } from './fieldStyle'
import { formatMetricNumber, toFiniteNumber } from './numberStyle'
import { dimensionAlias, isTrendChart, metricAlias, regularMetrics } from './types'

export const TREND_DEFAULTS = {
  showSparkline: true,
  showChange: true,
} as const satisfies Required<VisTrendOptions>

export function resolveTrendOptions(visual?: VisVisualConfig): Required<VisTrendOptions> {
  const raw = visual?.trend ?? {}
  return {
    showSparkline: raw.showSparkline ?? TREND_DEFAULTS.showSparkline,
    showChange: raw.showChange ?? TREND_DEFAULTS.showChange,
  }
}

export function pruneTrendVisual(visual: VisVisualConfig) {
  if (!isTrendChart(visual.chartType)) {
    delete visual.trend
    return visual
  }
  const raw = visual.trend
  if (!raw)
    return visual
  if (raw.showSparkline !== false)
    delete raw.showSparkline
  if (raw.showChange !== false)
    delete raw.showChange
  if (!Object.keys(raw).length)
    delete visual.trend
  return visual
}

function compareDimValue(left: unknown, right: unknown) {
  const a = Number(left)
  const b = Number(right)
  if (Number.isFinite(a) && Number.isFinite(b) && left !== '' && right !== '')
    return a - b
  return String(left ?? '').localeCompare(String(right ?? ''), 'zh-CN')
}

export function sortTrendRows(rows: Record<string, any>[], dimField: string) {
  return rows.slice().sort((left, right) => compareDimValue(left[dimField], right[dimField]))
}

export interface TrendView {
  label: string
  prefix: string
  body: string
  compactSuffix: string
  suffix: string
  points: number[]
  changeText: string
  changeDirection: 'up' | 'down' | 'flat'
  auxiliaries: Array<{ key: string, label: string, text: string }>
  lastRow: Record<string, unknown> | null
}

export function resolveTrendView(
  query: VIS.QueryConfig,
  data: VIS.QueryDataResponse,
  visual: VisVisualConfig,
): TrendView | null {
  if (!query || !data)
    return null
  const dim = query.dimensions?.[0]
  const metrics = regularMetrics(query.metrics)
  const primary = metrics[0]
  if (!dim || !primary)
    return null
  const dimField = dimensionAlias(dim)
  const valueField = metricAlias(primary)
  const rows = sortTrendRows((data.rows ?? []).filter(row => row && row[dimField] != null && row[dimField] !== ''), dimField)
  const points = rows.map(row => toFiniteNumber(row[valueField])).filter((n): n is number => n != null)
  if (!rows.length || !points.length)
    return null
  let lastRow = rows[rows.length - 1]
  for (let index = rows.length - 1; index >= 0; index--) {
    if (toFiniteNumber(rows[index][valueField]) != null) {
      lastRow = rows[index]
      break
    }
  }
  const last = toFiniteNumber(lastRow[valueField])
  const prev = points.length > 1 ? points[points.length - 2] : null
  const format = resolveMetricFormat(visual, primary)
  const parts = formatMetricNumber(last, format)
  const opt = resolveTrendOptions(visual)
  let changeText = ''
  let changeDirection: TrendView['changeDirection'] = 'flat'
  if (opt.showChange && prev != null && last != null) {
    const diff = last - prev
    changeDirection = diff === 0 ? 'flat' : diff > 0 ? 'up' : 'down'
    if (prev === 0)
      changeText = formatFieldText(diff, format, { signed: true })
    else
      changeText = formatFieldText((diff / Math.abs(prev)) * 100, FIELD_FORMAT_DEFAULTS, { signed: true })
  }
  const auxiliaries = metrics.slice(1).map((metric, index) => {
    const alias = metricAlias(metric)
    return {
      key: `${alias}-${index}`,
      label: metric.label || metric.field || alias,
      text: formatMetricField(visual, query, alias, lastRow[alias]),
    }
  })
  return {
    label: primary.label || primary.field || valueField,
    prefix: parts.empty ? '' : format.prefix,
    body: parts.body,
    compactSuffix: parts.compactSuffix,
    suffix: parts.empty ? '' : format.suffix,
    points,
    changeText,
    changeDirection,
    auxiliaries,
    lastRow,
  }
}

export interface SparklineGeom {
  line: string
  area: string
  last: { x: number, y: number } | null
}

function fmt(n: number) {
  return n.toFixed(2)
}

function sparkDots(values: number[], width: number, height: number, pad: number) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const innerW = Math.max(width - pad * 2, 1)
  const innerH = Math.max(height - pad * 2, 1)
  return values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : pad + (index / (values.length - 1)) * innerW,
    y: pad + (1 - (value - min) / span) * innerH,
  }))
}

/** Catmull-Rom，控制点 Y 限制在画布内，避免尖峰画出框 */
function curveThrough(pts: Array<{ x: number, y: number }>, height: number, pad: number) {
  const low = pad
  const high = height - pad
  let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1y = Math.min(high, Math.max(low, p1.y + (p2.y - p0.y) / 6))
    const c2y = Math.min(high, Math.max(low, p2.y - (p3.y - p1.y) / 6))
    d += ` C ${fmt(p1.x + (p2.x - p0.x) / 6)} ${fmt(c1y)} ${fmt(p2.x - (p3.x - p1.x) / 6)} ${fmt(c2y)} ${fmt(p2.x)} ${fmt(p2.y)}`
  }
  return d
}

export function sparklineGeom(values: number[], width: number, height: number, pad = 4): SparklineGeom {
  if (!values.length)
    return { line: '', area: '', last: null }
  const pts = sparkDots(values, width, height, pad)
  const last = pts[pts.length - 1]
  if (pts.length === 1)
    return { line: `M ${fmt(last.x)} ${fmt(last.y)}`, area: '', last }
  const line = pts.length === 2
    ? `M ${fmt(pts[0].x)} ${fmt(pts[0].y)} L ${fmt(pts[1].x)} ${fmt(pts[1].y)}`
    : curveThrough(pts, height, pad)
  const first = pts[0]
  const area = `${line} L ${fmt(last.x)} ${fmt(height)} L ${fmt(first.x)} ${fmt(height)} Z`
  return { line, area, last }
}
