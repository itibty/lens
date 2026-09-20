import type { MetricTooltipPeriod } from './metricTooltip'
import type { VisVisualConfig } from './types'
import { formatMetricField, resolveMetricFieldColor, resolveMetricFormat, resolveSignColor } from './fieldStyle'
import { metricTooltipPeriods } from './metricTooltip'
import { formatMetricNumber, toFiniteNumber } from './numberStyle'
import { metricAlias } from './types'

export type NumberContrastDirection = 'up' | 'down' | 'flat'

export type NumberAuxKind = 'metric' | 'contrast'

export interface NumberContrastView {
  key: string
  label: string
  text: string
  direction: NumberContrastDirection
  periods: MetricTooltipPeriod[]
  kind?: NumberAuxKind
  value?: number | string | null
  color?: string
}

function pickPrimaryMetric(query: VIS.QueryConfig): VIS.MetricItem | undefined {
  return query.metrics?.[0]
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

/** 第 1 个指标作为主指标，其余指标按投放顺序展示在辅区。 */
export function pickNumberAuxiliaries(
  query: VIS.QueryConfig,
  data: VIS.QueryDataResponse,
): NumberContrastView[] {
  const row = data.rows?.[0]
  if (!row)
    return []
  const items: NumberContrastView[] = []
  for (const [index, metric] of (query.metrics ?? []).entries()) {
    if (index === 0)
      continue
    if (!metric.contrast) {
      const alias = metricAlias(metric)
      const raw = row[alias]
      items.push({
        key: `metric-${alias}-${index}`,
        label: metric.label || metric.field || alias,
        text: raw == null || raw === '' ? '-' : String(raw),
        direction: 'flat',
        periods: [],
        kind: 'metric',
        value: raw as number | string | null,
      })
      continue
    }

    const label = metric.label || metricAlias(metric)
    const value = toFiniteNumber(row[label])
    const direction: NumberContrastDirection = value == null || value === 0
      ? 'flat'
      : value > 0 ? 'up' : 'down'
    items.push({
      key: `contrast-${label}-${index}`,
      label,
      text: value == null ? '-' : String(value),
      direction,
      periods: metricTooltipPeriods(metric, data),
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
  periods: MetricTooltipPeriod[]
  color?: string
  auxiliaries: NumberContrastView[]
}

export function resolveNumberView(
  query: VIS.QueryConfig,
  data: VIS.QueryDataResponse,
  visual: VisVisualConfig,
): NumberView | null {
  const primary = pickPrimaryMetric(query)
  const format = resolveMetricFormat(visual, primary)
  const value = toFiniteNumber(pickNumberValue(query, data))
  const parts = formatMetricNumber(value, format)
  if (parts.empty)
    return null
  const auxiliaries = pickNumberAuxiliaries(query, data).map(item => ({
    ...item,
    color: resolveMetricFieldColor(visual, query, item.label, item.value),
    text: formatMetricField(visual, query, item.label, item.value, {
      signed: item.kind === 'contrast',
    }),
  }))
  const body = primary?.contrast && value != null && value > 0 ? `+${parts.body}` : parts.body
  return {
    label: pickNumberMetricLabel(query),
    prefix: format.prefix,
    body,
    compactSuffix: parts.compactSuffix,
    suffix: format.suffix,
    color: resolveSignColor(value, format.signColor),
    periods: metricTooltipPeriods(primary, data),
    auxiliaries,
  }
}
