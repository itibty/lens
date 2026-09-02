/**
 * 按指标覆盖显示格式（visual.fieldStyles）。
 * 只打扮数字，不改查询结果；未添加的字段走 implicitFieldFormat，落库只写差异。
 */
import type { VisFieldStyleRule, VisNumberFormat, VisQueryConfig, VisVisualConfig } from './types'
import {
  formatMetricNumber,
  joinMetricNumber,
  toFiniteNumber,
} from './numberStyle'
import { DEFAULT_METRIC_AGG, metricAlias } from './types'

export const FIELD_FORMAT_DEFAULTS = {
  decimals: 'auto',
  separator: true,
  prefix: '',
  suffix: '',
  compact: false,
} as const satisfies Required<VisNumberFormat>

export type ResolvedFieldFormat = Required<VisNumberFormat>

export interface FieldStyleCandidate {
  sourceUid: string
  key: string
  alias: string
  display: string
  diffRate: boolean
  metric: VIS.MetricItem
}

export function isDiffRateMetric(metric?: VIS.MetricItem) {
  return metric?.contrast?.calcType === 'diffRate'
}

export function fieldStyleKey(metric: VIS.MetricItem) {
  const agg = metric.agg || DEFAULT_METRIC_AGG
  const contrast = metric.contrast
  if (!contrast)
    return `m:${metric.field}:${agg}`
  return [
    'm',
    metric.field,
    agg,
    contrast.timeField || '',
    contrast.calcMethod || '',
    contrast.calcType || '',
    contrast.valueExp || '',
  ].join(':')
}

export function implicitFieldFormat(metric?: VIS.MetricItem): ResolvedFieldFormat {
  return {
    ...FIELD_FORMAT_DEFAULTS,
    suffix: isDiffRateMetric(metric) ? '%' : '',
  }
}

export function buildFieldStyleCandidates(
  metrics?: Array<VIS.MetricItem & { _uid?: string }>,
): FieldStyleCandidate[] {
  const list: FieldStyleCandidate[] = []
  for (const metric of metrics ?? []) {
    if (!metric.field)
      continue
    const key = fieldStyleKey(metric)
    list.push({
      sourceUid: metric._uid || key,
      key,
      alias: metricAlias(metric),
      display: '',
      diffRate: isDiffRateMetric(metric),
      metric,
    })
  }
  for (const item of list) {
    const clash = list.some(other => other !== item && other.alias === item.alias)
    item.display = clash
      ? `${item.alias}（${item.diffRate ? '差值率' : item.metric.contrast ? '差值' : '指标'}）`
      : item.alias
  }
  return list
}

function sameRule(a: VisFieldStyleRule, b: VisFieldStyleRule) {
  return a.sourceUid === b.sourceUid
    && a.key === b.key
    && a.kind === b.kind
    && JSON.stringify(a.format ?? null) === JSON.stringify(b.format ?? null)
}

export function syncFieldStyles(
  rules: VisFieldStyleRule[] | undefined,
  candidates: FieldStyleCandidate[],
): VisFieldStyleRule[] {
  const byUid = new Map(candidates.map(c => [c.sourceUid, c]))
  const byKey = new Map<string, FieldStyleCandidate>()
  for (const cand of candidates) {
    if (!byKey.has(cand.key))
      byKey.set(cand.key, cand)
  }
  const seen = new Set<string>()
  const next: VisFieldStyleRule[] = []
  for (const rule of rules ?? []) {
    const cand = (rule.sourceUid ? byUid.get(rule.sourceUid) : undefined)
      ?? byKey.get(rule.key)
    if (!cand || seen.has(cand.key))
      continue
    seen.add(cand.key)
    next.push({
      sourceUid: cand.sourceUid,
      key: cand.key,
      kind: 'metric',
      format: compactFormat(rule.format, cand.metric),
    })
  }
  const prev = rules ?? []
  if (prev.length === next.length && prev.every((item, i) => sameRule(item, next[i]!)))
    return prev
  return next
}

function compactFormat(raw: VisNumberFormat | undefined, metric: VIS.MetricItem) {
  if (!raw)
    return undefined
  const implicit = implicitFieldFormat(metric)
  const next: VisNumberFormat = {}
  if (raw.decimals != null && raw.decimals !== implicit.decimals)
    next.decimals = raw.decimals
  if (raw.separator != null && raw.separator !== implicit.separator)
    next.separator = raw.separator
  if (raw.compact != null && raw.compact !== implicit.compact)
    next.compact = raw.compact
  const prefix = raw.prefix?.trim() ?? ''
  if (prefix !== implicit.prefix)
    next.prefix = prefix
  const suffix = raw.suffix != null ? raw.suffix.trim() : implicit.suffix
  if (suffix !== implicit.suffix)
    next.suffix = suffix
  return Object.keys(next).length ? next : undefined
}

export function unusedFieldStyleCandidates(
  candidates: FieldStyleCandidate[],
  rules: VisFieldStyleRule[] | undefined,
) {
  const usedUid = new Set((rules ?? []).map(item => item.sourceUid).filter((uid): uid is string => !!uid))
  const usedKey = new Set((rules ?? []).map(item => item.key))
  return candidates.filter(item => !usedUid.has(item.sourceUid) && !usedKey.has(item.key))
}

export function fieldStyleFromDraft(candidate: FieldStyleCandidate, draft: VisNumberFormat): VisFieldStyleRule {
  return {
    sourceUid: candidate.sourceUid,
    key: candidate.key,
    kind: 'metric',
    format: compactFormat(draft, candidate.metric),
  }
}

export function resolveFieldFormat(
  visual: VisVisualConfig | undefined,
  query: Pick<VisQueryConfig, 'metrics'> | undefined,
  alias: string,
): ResolvedFieldFormat {
  const metric = (query?.metrics ?? []).find(item => metricAlias(item) === alias)
  return resolveMetricFormat(visual, metric)
}

export function resolveMetricFormat(
  visual: VisVisualConfig | undefined,
  metric?: VIS.MetricItem & { _uid?: string },
): ResolvedFieldFormat {
  const implicit = implicitFieldFormat(metric)
  if (!metric)
    return implicit
  const key = fieldStyleKey(metric)
  const uid = metric._uid
  const rule = (visual?.fieldStyles ?? []).find(item =>
    (uid && item.sourceUid === uid) || item.key === key,
  )
  return {
    ...implicit,
    ...rule?.format,
    prefix: rule?.format?.prefix?.trim() ?? implicit.prefix,
    suffix: rule?.format?.suffix ?? implicit.suffix,
  }
}

export function formatFieldText(
  value: unknown,
  format: ResolvedFieldFormat,
  opts?: { signed?: boolean },
) {
  const n = toFiniteNumber(value)
  if (n == null && (value == null || value === ''))
    return '-'
  const signed = !!opts?.signed
  const abs = signed && n != null ? Math.abs(n) : value
  const parts = formatMetricNumber(abs as number | string | null, format)
  const text = joinMetricNumber(parts, format.prefix, format.suffix)
  if (parts.empty || !signed || n == null || n === 0)
    return text
  return `${n > 0 ? '+' : '-'}${text}`
}

export function formatMetricField(
  visual: VisVisualConfig | undefined,
  query: Pick<VisQueryConfig, 'metrics'> | undefined,
  alias: string,
  value: unknown,
  opts?: { signed?: boolean },
) {
  const metric = (query?.metrics ?? []).find(item => metricAlias(item) === alias)
  return formatFieldText(value, resolveMetricFormat(visual, metric), {
    signed: opts?.signed ?? !!metric?.contrast,
  })
}

export function pruneFieldStyles(visual: VisVisualConfig, query?: VisQueryConfig) {
  const next = syncFieldStyles(visual.fieldStyles, buildFieldStyleCandidates(query?.metrics))
  if (!next.length)
    delete visual.fieldStyles
  else
    visual.fieldStyles = next
  return visual
}
