import type { VisAccentPresetId } from './accentPresets'
import type { VisProgressSize, VisRankOptions, VisVisualConfig } from './types'
import { accentPreview, findAccentPreset, resolveAccentByColor, VIS_ACCENT_PRESETS } from './accentPresets'
import { resolveCardChrome } from './cardTheme'
import { formatMetricNumber, joinMetricNumber, toFiniteNumber } from './numberStyle'
import { dimensionAlias, isRankChart, metricAlias, regularMetrics } from './types'

export const RANK_DEFAULTS = {
  showRank: true,
  showValue: true,
  showPercent: false,
  showBar: true,
  decimals: 'auto',
  separator: true,
  prefix: '',
  compact: false,
  size: 'md',
} as const satisfies Required<Omit<VisRankOptions, 'color'>>

export const RANK_FEATURE_TIPS = {
  showBar: '条长度对照最大值，不是合计占比',
} as const

export const RANK_COLOR_PRESETS = VIS_ACCENT_PRESETS
export type VisRankColorPresetId = VisAccentPresetId

export interface RankSizePreset {
  id: VisProgressSize
  name: string
  nameSize: number
  valueSize: number
  rankSize: number
  barHeight: number
  gap: number
}

export const RANK_SIZE_PRESETS: RankSizePreset[] = [
  { id: 'xs', name: '极小', nameSize: 12, valueSize: 12, rankSize: 12, barHeight: 4, gap: 6 },
  { id: 'sm', name: '小', nameSize: 13, valueSize: 13, rankSize: 13, barHeight: 6, gap: 8 },
  { id: 'md', name: '中', nameSize: 14, valueSize: 14, rankSize: 14, barHeight: 8, gap: 10 },
  { id: 'lg', name: '大', nameSize: 15, valueSize: 16, rankSize: 16, barHeight: 10, gap: 12 },
  { id: 'xl', name: '极大', nameSize: 16, valueSize: 18, rankSize: 18, barHeight: 12, gap: 14 },
]

const SIZE_MAP = Object.fromEntries(
  RANK_SIZE_PRESETS.map(item => [item.id, item]),
) as Record<VisProgressSize, RankSizePreset>

const RANK_MAX = 50

export function rankSizeOf(size?: string): RankSizePreset {
  if (size && size in SIZE_MAP)
    return SIZE_MAP[size as VisProgressSize]
  return SIZE_MAP[RANK_DEFAULTS.size]
}

export function rankSizeSpec(item: RankSizePreset) {
  return [item.nameSize, item.valueSize, item.barHeight]
}

export function rankSizeVars(size?: string) {
  const s = rankSizeOf(size)
  return {
    '--vis-rank-gap': `${s.gap}px`,
    '--vis-rank-name': `${s.nameSize}px`,
    '--vis-rank-value': `${s.valueSize}px`,
    '--vis-rank-no': `${s.rankSize}px`,
    '--vis-rank-bar': `${s.barHeight}px`,
  }
}

export interface ResolvedRankOptions {
  showRank: boolean
  showValue: boolean
  showPercent: boolean
  showBar: boolean
  decimals: NonNullable<VisRankOptions['decimals']>
  separator: boolean
  prefix: string
  compact: boolean
  size: VisProgressSize
  color?: string
}

export function resolveRankOptions(visual?: VisVisualConfig): ResolvedRankOptions {
  const raw = visual?.rank ?? {}
  return {
    showRank: raw.showRank ?? RANK_DEFAULTS.showRank,
    showValue: raw.showValue ?? RANK_DEFAULTS.showValue,
    showPercent: raw.showPercent ?? RANK_DEFAULTS.showPercent,
    showBar: raw.showBar ?? RANK_DEFAULTS.showBar,
    decimals: raw.decimals ?? RANK_DEFAULTS.decimals,
    separator: raw.separator ?? RANK_DEFAULTS.separator,
    prefix: raw.prefix ?? RANK_DEFAULTS.prefix,
    compact: raw.compact ?? RANK_DEFAULTS.compact,
    size: rankSizeOf(raw.size).id,
    color: raw.color,
  }
}

export function resolveRankColorPreset(visual?: VisVisualConfig) {
  return resolveAccentByColor(visual?.rank?.color)
}

export function rankColorPatch(id: VisRankColorPresetId) {
  const item = findAccentPreset(id)
  if (!item || item.id === 'default')
    return null
  return { color: item.color }
}

export function rankColorPreview(item: (typeof RANK_COLOR_PRESETS)[number]) {
  return accentPreview(item)
}

export function resolveRankBarColor(visual: VisVisualConfig) {
  return visual.rank?.color || resolveCardChrome(visual).color || '#1677FF'
}

export function pruneRankVisual(visual: VisVisualConfig) {
  if (!isRankChart(visual.chartType)) {
    delete visual.rank
    return visual
  }
  const raw = visual.rank
  if (!raw)
    return visual
  if (raw.showRank !== false)
    delete raw.showRank
  if (raw.showValue !== false)
    delete raw.showValue
  if (!raw.showPercent)
    delete raw.showPercent
  if (raw.showBar !== false)
    delete raw.showBar
  if (raw.decimals === RANK_DEFAULTS.decimals)
    delete raw.decimals
  if (raw.separator !== false)
    delete raw.separator
  if (!raw.prefix?.trim())
    delete raw.prefix
  else
    raw.prefix = raw.prefix.trim()
  if (!raw.compact)
    delete raw.compact
  if (raw.size === RANK_DEFAULTS.size)
    delete raw.size
  if (!raw.color)
    delete raw.color
  if (!Object.keys(raw).length)
    delete visual.rank
  return visual
}

export interface RankItemView {
  rank: number
  name: string
  valueText: string
  percentText: string
  barRatio: number
  record: Record<string, unknown>
}

export function resolveRankItems(
  query: VIS.QueryConfig,
  data: VIS.QueryDataResponse,
  visual: VisVisualConfig,
): RankItemView[] {
  const dim = query.dimensions?.[0]
  const metric = regularMetrics(query.metrics)[0]
  if (!dim || !metric)
    return []
  const dimField = dimensionAlias(dim)
  const valueField = metricAlias(metric)
  const opt = resolveRankOptions(visual)
  const rows = (data.rows ?? [])
    .map((row) => {
      const value = toFiniteNumber(row?.[valueField])
      const name = row?.[dimField]
      if (value == null || name == null || name === '')
        return null
      return { value, name: String(name), record: row as Record<string, unknown> }
    })
    .filter((item): item is { value: number, name: string, record: Record<string, unknown> } => !!item)
    .sort((left, right) => right.value - left.value)
    .slice(0, RANK_MAX)
  const max = Math.max(0, ...rows.map(item => Math.abs(item.value)))
  const total = rows.reduce((sum, item) => sum + Math.abs(item.value), 0)
  return rows.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    valueText: joinMetricNumber(formatMetricNumber(item.value, opt), opt.prefix.trim()),
    percentText: total > 0
      ? `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format((Math.abs(item.value) / total) * 100)}%`
      : '0%',
    barRatio: max > 0 ? Math.abs(item.value) / max : 0,
    record: item.record,
  }))
}
