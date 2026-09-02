import type { VisVisualConfig } from './types'
import { contrastPeriodDescription, formatContrastRange } from './contrastExp'
import { formatMetricField, resolveMetricFormat } from './fieldStyle'
import { formatMetricNumber, toFiniteNumber } from './numberStyle'
import { metricAlias, regularMetrics } from './types'

export type NumberContrastDirection = 'up' | 'down' | 'flat'

export type NumberAuxKind = 'metric' | 'contrast'

export interface NumberContrastView {
  key: string
  label: string
  text: string
  direction: NumberContrastDirection
  title: string
  kind?: NumberAuxKind
  value?: number | string | null
}

function pickPrimaryMetric(query: VIS.QueryConfig): VIS.MetricItem | undefined {
  return regularMetrics(query.metrics)[0]
}

export function pickNumberValue(query: VIS.QueryConfig, data: VIS.QueryDataResponse): number | string | null {
  const rows = data.rows ?? []
  if (!rows.length)
    return null
  const metric = pickPrimaryMetric(query)
  if (!metric)
    return null
  const value = rows[0]?.[metricAlias(metric)]
  return value == null ? null : value as number | string
}

export function pickNumberMetricLabel(query: VIS.QueryConfig): string {
  const metric = pickPrimaryMetric(query)
  return metric?.label || metric?.field || '指标'
}

/** 主指标周期：优先 contrasts.current，否则 asOfDate */
export function pickNumberPeriodTitle(data: VIS.QueryDataResponse): string {
  const current = data.contrasts?.find(item => item.current?.start)?.current
  const text = formatContrastRange(current) || data.asOfDate || ''
  return text ? `评估 ${text}` : ''
}

/** 指标卡辅区：主指标之后的普通指标 + 同比 / 环比，保持投放顺序 */
export function pickNumberAuxiliaries(
  query: VIS.QueryConfig,
  data: VIS.QueryDataResponse,
): NumberContrastView[] {
  const row = data.rows?.[0]
  if (!row)
    return []
  const infos = data.contrasts ?? []
  const periodTitle = pickNumberPeriodTitle(data)
  const items: NumberContrastView[] = []
  let seenPrimary = false

  for (const [index, metric] of (query.metrics ?? []).entries()) {
    if (!metric.contrast) {
      if (!seenPrimary) {
        seenPrimary = true
        continue
      }
      const alias = metricAlias(metric)
      const raw = row[alias]
      items.push({
        key: `metric-${alias}-${index}`,
        label: metric.label || metric.field || alias,
        text: raw == null || raw === '' ? '-' : String(raw),
        direction: 'flat',
        title: periodTitle,
        kind: 'metric',
        value: raw as number | string | null,
      })
      continue
    }

    const label = metric.label || metricAlias(metric)
    const info = infos.find(item => item.label === label)
    const value = toFiniteNumber(row[label])
    const direction: NumberContrastDirection = value == null || value === 0
      ? 'flat'
      : value > 0 ? 'up' : 'down'
    items.push({
      key: `contrast-${label}-${index}`,
      label,
      text: value == null ? '-' : String(value),
      direction,
      title: contrastPeriodDescription(info),
      kind: 'contrast',
      value,
    })
  }
  return items
}

export interface NumberView {
  label: string
  prefix: string
  body: string
  compactSuffix: string
  suffix: string
  periodTitle: string
  auxiliaries: NumberContrastView[]
}

export function resolveNumberView(
  query: VIS.QueryConfig,
  data: VIS.QueryDataResponse,
  visual: VisVisualConfig,
): NumberView {
  const primary = pickPrimaryMetric(query)
  const format = resolveMetricFormat(visual, primary)
  const parts = formatMetricNumber(pickNumberValue(query, data), format)
  const auxiliaries = pickNumberAuxiliaries(query, data).map(item => ({
    ...item,
    text: formatMetricField(visual, query, item.label, item.value, {
      signed: item.kind === 'contrast',
    }),
  }))
  return {
    label: pickNumberMetricLabel(query),
    prefix: parts.empty ? '' : format.prefix,
    body: parts.body,
    compactSuffix: parts.compactSuffix,
    suffix: parts.empty ? '' : format.suffix,
    periodTitle: pickNumberPeriodTitle(data),
    auxiliaries,
  }
}
