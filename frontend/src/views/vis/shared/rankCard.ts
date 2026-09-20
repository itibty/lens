import type { VisRankOptions, VisRankSize, VisVisualConfig } from './types'
import { formatFieldText, resolveMetricFormat, resolveSignColor } from './fieldStyle'
import { toFiniteNumber } from './numberStyle'
import { dimensionAlias, isRankChart, metricAlias, regularMetrics } from './types'

export const RANK_DEFAULTS = {
  showValue: true,
  showPercent: false,
  size: 'md',
} as const satisfies Required<Omit<VisRankOptions, 'decimals' | 'separator' | 'prefix' | 'suffix' | 'compact' | 'signColor'>>

export interface RankSizePreset {
  id: VisRankSize
  name: string
  nameSize: number
  valueSize: number
  rankSize: number
  gap: number
}

export const RANK_SIZE_PRESETS: RankSizePreset[] = [
  { id: 'sm', name: '小', nameSize: 12, valueSize: 12, rankSize: 12, gap: 6 },
  { id: 'md', name: '标准', nameSize: 14, valueSize: 14, rankSize: 14, gap: 10 },
  { id: 'lg', name: '大', nameSize: 16, valueSize: 18, rankSize: 18, gap: 14 },
]

const SIZE_MAP = Object.fromEntries(
  RANK_SIZE_PRESETS.map(item => [item.id, item]),
) as Record<VisRankSize, RankSizePreset>

const RANK_MAX = 50

export function rankSizeOf(size?: string): RankSizePreset {
  if (size === 'sm')
    return SIZE_MAP.sm
  if (size === 'lg')
    return SIZE_MAP.lg
  return SIZE_MAP[RANK_DEFAULTS.size]
}

export function rankSizeSpec(item: RankSizePreset) {
  return [item.nameSize, item.valueSize]
}

export function rankSizeVars(size?: string) {
  const s = rankSizeOf(size)
  return {
    '--vis-rank-gap': `${s.gap}px`,
    '--vis-rank-name': `${s.nameSize}px`,
    '--vis-rank-value': `${s.valueSize}px`,
    '--vis-rank-no': `${s.rankSize}px`,
  }
}

export interface ResolvedRankOptions {
  showValue: boolean
  showPercent: boolean
  size: VisRankSize
}

export function resolveRankOptions(visual?: VisVisualConfig): ResolvedRankOptions {
  const raw = visual?.rank ?? {}
  return {
    showValue: raw.showValue ?? RANK_DEFAULTS.showValue,
    showPercent: raw.showPercent ?? RANK_DEFAULTS.showPercent,
    size: rankSizeOf(raw.size).id,
  }
}

export function pruneRankVisual(visual: VisVisualConfig) {
  if (!isRankChart(visual.chartType)) {
    delete visual.rank
    return visual
  }
  const raw = visual.rank as (VisRankOptions & { showRank?: boolean, showBar?: boolean, color?: string }) | undefined
  if (!raw)
    return visual
  if (raw.showValue !== false)
    delete raw.showValue
  if (!raw.showPercent)
    delete raw.showPercent
  // 清理旧卡片中已移除的名次开关、数值条设置。
  delete raw.showRank
  delete raw.showBar
  delete raw.color
  delete raw.decimals
  delete raw.separator
  delete raw.prefix
  delete raw.suffix
  delete raw.compact
  const size = rankSizeOf(raw.size).id
  if (size === RANK_DEFAULTS.size)
    delete raw.size
  else
    raw.size = size
  if (!Object.keys(raw).length)
    delete visual.rank
  return visual
}

export interface RankItemView {
  rank: number
  name: string
  valueText: string
  valueColor?: string
  percentText: string
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
  const total = rows.reduce((sum, item) => sum + Math.abs(item.value), 0)
  const format = resolveMetricFormat(visual, metric)
  return rows.map((item, index) => ({
    rank: index + 1,
    name: item.name,
    valueText: formatFieldText(item.value, format),
    valueColor: resolveSignColor(item.value, format.signColor),
    percentText: total > 0
      ? `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1, minimumFractionDigits: 0 }).format((Math.abs(item.value) / total) * 100)}%`
      : '0%',
    record: item.record,
  }))
}
