/**
 * 按指标覆盖显示格式 / 表格单元格展示（visual.fieldStyles）。
 * 不改查询结果；未添加的字段走 implicitFieldFormat，落库只写差异。
 */
import type { ChartType, VisFieldStyleRule, VisMetricCellVisual, VisNumberFormat, VisQueryConfig, VisVisualConfig } from './types'
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
} as const satisfies Required<Omit<VisNumberFormat, 'signColor'>>

export type ResolvedFieldFormat = Required<Omit<VisNumberFormat, 'signColor'>> & Pick<VisNumberFormat, 'signColor'>

export const SIGN_COLOR_OPTIONS = [
  { value: 'positive-red', label: '正红负绿' },
  { value: 'positive-green', label: '正绿负红' },
] as const

export const SIGN_COLOR_TIP = '优先于内容色；零值、空值沿用原有文字颜色。'

/** 数值卡片和表格支持按字段着色，几何图表仍使用图表系列配色。 */
export function supportsMetricSignColor(chartType: ChartType) {
  return ['number', 'trend', 'progress', 'kpi', 'rank', 'table', 'pivot'].includes(chartType)
}

export function resolveSignColor(
  value: unknown,
  rule: VisNumberFormat['signColor'],
  palette = { red: 'var(--el-color-danger)', green: 'var(--el-color-success)' },
): string | undefined {
  if (rule !== 'positive-red' && rule !== 'positive-green')
    return undefined
  const number = toFiniteNumber(value)
  if (number == null || number === 0)
    return undefined
  return (number > 0) === (rule === 'positive-red') ? palette.red : palette.green
}

export function resolveMetricFieldColor(
  visual: VisVisualConfig | undefined,
  query: Pick<VisQueryConfig, 'metrics'> | undefined,
  alias: string,
  value: unknown,
) {
  return resolveSignColor(value, resolveFieldFormat(visual, query, alias).signColor)
}

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

export function implicitFieldFormat(_metric?: VIS.MetricItem): ResolvedFieldFormat {
  return { ...FIELD_FORMAT_DEFAULTS }
}

/** 仅供新建格式草稿预填；不参与渲染默认值。 */
export function suggestedFieldSuffix(metric?: VIS.MetricItem) {
  return isDiffRateMetric(metric) ? '%' : ''
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
    && JSON.stringify(a.cellVisual ?? null) === JSON.stringify(b.cellVisual ?? null)
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
      cellVisual: compactCellVisual(rule.cellVisual),
    })
  }
  const prev = rules ?? []
  if (prev.length === next.length && prev.every((item, i) => sameRule(item, next[i]!)))
    return prev
  return next
}

export function compactCellVisual(raw: VisMetricCellVisual | undefined): VisMetricCellVisual | undefined {
  if (raw?.type !== 'progress')
    return undefined
  const color = raw.color?.trim()
  return {
    type: 'progress',
    ...(color ? { color } : {}),
  }
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
  if (raw.signColor === 'positive-red' || raw.signColor === 'positive-green')
    next.signColor = raw.signColor
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

export function fieldStyleFromDraft(
  candidate: FieldStyleCandidate,
  draft: VisNumberFormat,
  cellVisual?: VisMetricCellVisual,
): VisFieldStyleRule {
  return {
    sourceUid: candidate.sourceUid,
    key: candidate.key,
    kind: 'metric',
    format: compactFormat(draft, candidate.metric),
    cellVisual: compactCellVisual(cellVisual),
  }
}

export function resolveMetricStyleRule(
  visual: VisVisualConfig | undefined,
  metric?: VIS.MetricItem & { _uid?: string },
) {
  if (!metric)
    return undefined
  const key = fieldStyleKey(metric)
  const uid = metric._uid
  return (visual?.fieldStyles ?? []).find(item =>
    (uid && item.sourceUid === uid) || item.key === key,
  )
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
  const rule = resolveMetricStyleRule(visual, metric)
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
