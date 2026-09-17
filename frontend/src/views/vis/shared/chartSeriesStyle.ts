import type { VisQueryConfig, VisSeriesRule, VisSeriesStyle, VisSeriesTarget, VisVisualConfig } from './types'
import { dimensionAlias, metricAlias, regularMetrics } from './types'

export function supportsSeriesStyle(type?: string) {
  return type === 'bar' || type === 'line' || type === 'combo'
}

export function seriesTargetKey(target: VisSeriesTarget) {
  return 'metric' in target
    ? JSON.stringify(['metric', target.metric])
    : JSON.stringify(['dimension', target.dimension, typeof target.value, target.value])
}

export function seriesDimension(query?: VisQueryConfig) {
  return regularMetrics(query?.metrics).length === 1 ? query?.dimensions?.[1] : undefined
}

export function sanitizeSeriesStyles(raw: unknown, query?: VisQueryConfig): VisSeriesRule[] {
  if (!Array.isArray(raw))
    return []
  const aliases = new Set(regularMetrics(query?.metrics).map(metricAlias))
  const dim = seriesDimension(query)
  const seen = new Set<string>()
  const result: VisSeriesRule[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object' || !item.style)
      continue
    let target: VisSeriesTarget
    if (typeof item.metric === 'string' && aliases.has(item.metric)) {
      target = { metric: item.metric }
    }
    else if (dim && item.dimension === dim.field && ['string', 'number', 'boolean'].includes(typeof item.value)
      && (typeof item.value !== 'number' || Number.isFinite(item.value))) {
      target = { dimension: dim.field, value: item.value }
    }
    else {
      continue
    }
    const key = seriesTargetKey(target)
    if (seen.has(key))
      continue
    const style: VisSeriesStyle = {}
    const source = item.style
    if (typeof source.color === 'string' && /^#[\da-f]{6}$/i.test(source.color))
      style.color = source.color
    if (['solid', 'dashed', 'dotted'].includes(source.lineStyle))
      style.lineStyle = source.lineStyle
    if ([1, 2, 4].includes(source.lineWidth))
      style.lineWidth = source.lineWidth
    if (typeof source.points === 'boolean')
      style.points = source.points
    if (typeof source.dataLabel === 'boolean')
      style.dataLabel = source.dataLabel
    if (Object.keys(style).length) {
      seen.add(key)
      result.push({ ...target, style })
    }
  }
  return result
}

export function seriesCandidates(query?: VisQueryConfig, rows: Record<string, unknown>[] = [], rules: VisSeriesRule[] = []) {
  const dim = seriesDimension(query)
  if (!dim)
    return regularMetrics(query?.metrics).map(metric => ({ target: { metric: metricAlias(metric) }, label: metricAlias(metric) }))
  const candidates = new Map<string, { target: VisSeriesTarget, label: string }>()
  const add = (value: unknown) => {
    if (value === '' || value == null || !['string', 'number', 'boolean'].includes(typeof value))
      return
    const target: VisSeriesTarget = { dimension: dim.field, value: value as string | number | boolean }
    candidates.set(seriesTargetKey(target), { target, label: String(value) })
  }
  rows.forEach(row => add(row[dimensionAlias(dim)]))
  rules.forEach((rule) => {
    if ('dimension' in rule && rule.dimension === dim.field)
      add(rule.value)
  })
  return [...candidates.values()]
}

/** 指标别名是查询输出键；改名时与其他显示引用一起迁移。 */
export function remapSeriesAlias(visual: VisVisualConfig, from: string, to: string) {
  if (from === to || !visual.chart)
    return
  for (const rule of visual.chart.seriesStyles ?? []) {
    if ('metric' in rule && rule.metric === from)
      rule.metric = to
  }
  for (const key of ['lineFields', 'secondaryFields'] as const) {
    const list = visual.chart[key]
    if (list)
      visual.chart[key] = list.map(alias => alias === from ? to : alias)
  }
  for (const line of visual.chart.markLines ?? []) {
    if (line.field === from)
      line.field = to
  }
}

export function pruneSeriesStyles(visual: VisVisualConfig, query: VisQueryConfig) {
  if (!visual.chart?.seriesStyles)
    return
  const rules = sanitizeSeriesStyles(visual.chart.seriesStyles, query)
  if (JSON.stringify(rules) === JSON.stringify(visual.chart.seriesStyles))
    return
  if (rules.length)
    visual.chart.seriesStyles = rules
  else
    delete visual.chart.seriesStyles
}
