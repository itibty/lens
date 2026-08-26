import type { VisAccentPresetId } from './accentPresets'
import type { VisNumberSize, VisNumberStyle, VisVisualConfig } from './types'
import { accentPreview, findAccentPreset, resolveAccentByColor, VIS_ACCENT_PRESETS } from './accentPresets'
import { resolveCardChrome } from './cardTheme'
import { isNumberStyleChart } from './types'

/** 默认值、配色、尺寸、解析；表单只写差异，渲染侧在此填默认。 */

export const NUMBER_STYLE_DEFAULTS = {
  showLabel: false,
  showAuxLabel: false,
  decimals: 'auto',
  separator: true,
  prefix: '',
  compact: false,
  size: 'md',
} as const satisfies Required<
  Pick<VisNumberStyle, 'showLabel' | 'showAuxLabel' | 'decimals' | 'separator' | 'prefix' | 'compact' | 'size'>
>

export const NUMBER_FEATURE_TIPS = {
  showLabel: '显示在主值上方，当前指标名',
  showAuxLabel: '显示在辅值下方，辅指标名',
} as const

export type ResolvedNumberStyle = Required<
  Pick<VisNumberStyle, 'showLabel' | 'showAuxLabel' | 'decimals' | 'separator' | 'prefix' | 'compact' | 'size'>
> & Pick<VisNumberStyle, 'color'>

/** 指标卡配色（主值色）；默认不落库 */
export const NUMBER_COLOR_PRESETS = VIS_ACCENT_PRESETS
export type VisNumberColorPresetId = VisAccentPresetId

export interface NumberSizePreset {
  id: VisNumberSize
  name: string
  value: number
  aux: number
  auxLabel: number
  labelSize: number
  gap: number
}

/** 主值 / 辅值 / 指标名 */
export const NUMBER_SIZE_PRESETS: NumberSizePreset[] = [
  { id: 'xs', name: '极小', value: 22, aux: 12, auxLabel: 10, labelSize: 12, gap: 6 },
  { id: 'sm', name: '小', value: 28, aux: 13, auxLabel: 10, labelSize: 13, gap: 8 },
  { id: 'md', name: '中', value: 36, aux: 15, auxLabel: 11, labelSize: 15, gap: 10 },
  { id: 'lg', name: '大', value: 48, aux: 18, auxLabel: 12, labelSize: 16, gap: 12 },
  { id: 'xl', name: '极大', value: 56, aux: 22, auxLabel: 13, labelSize: 18, gap: 14 },
]

const SIZE_MAP = Object.fromEntries(
  NUMBER_SIZE_PRESETS.map(item => [item.id, item]),
) as Record<VisNumberSize, NumberSizePreset>

/* —— 尺寸 / 配色解析 —— */

export function numberSizeOf(size?: string): NumberSizePreset {
  if (size && size in SIZE_MAP)
    return SIZE_MAP[size as VisNumberSize]
  return SIZE_MAP[NUMBER_STYLE_DEFAULTS.size]
}

/** 选择条右侧：主值 / 辅值 / 指标名 */
export function numberSizeSpec(item: NumberSizePreset) {
  return [item.value, item.aux, item.labelSize]
}

export function numberSizeVars(size?: string) {
  const s = numberSizeOf(size)
  return {
    '--vis-number-gap': `${s.gap}px`,
    '--vis-number-value': `${s.value}px`,
    '--vis-number-aux': `${s.aux}px`,
    '--vis-number-aux-label': `${s.auxLabel}px`,
    '--vis-number-name': `${s.labelSize}px`,
  }
}

export function resolveNumberColorPreset(visual?: VisVisualConfig) {
  return resolveAccentByColor(visual?.number?.color)
}

export function numberColorPatch(id: VisNumberColorPresetId) {
  const item = findAccentPreset(id)
  if (!item || item.id === 'default')
    return null
  return { color: item.color }
}

export function numberColorPreview(item: (typeof NUMBER_COLOR_PRESETS)[number]) {
  return accentPreview(item)
}

export function resolveNumberValueColor(visual: VisVisualConfig) {
  return visual.number?.color || resolveCardChrome(visual).color
}

export function resolveNumberStyle(visual: VisVisualConfig): ResolvedNumberStyle {
  const raw = visual.number ?? {}
  return {
    showLabel: raw.showLabel ?? NUMBER_STYLE_DEFAULTS.showLabel,
    showAuxLabel: raw.showAuxLabel ?? NUMBER_STYLE_DEFAULTS.showAuxLabel,
    decimals: raw.decimals ?? NUMBER_STYLE_DEFAULTS.decimals,
    separator: raw.separator ?? NUMBER_STYLE_DEFAULTS.separator,
    prefix: raw.prefix ?? NUMBER_STYLE_DEFAULTS.prefix,
    compact: raw.compact ?? NUMBER_STYLE_DEFAULTS.compact,
    size: numberSizeOf(raw.size).id,
    color: raw.color,
  }
}

export function pruneNumberVisual(visual: VisVisualConfig) {
  if (!isNumberStyleChart(visual.chartType)) {
    delete visual.number
    return visual
  }
  const raw = visual.number
  if (!raw)
    return visual
  if (raw.size === NUMBER_STYLE_DEFAULTS.size)
    delete raw.size
  if (!Object.keys(raw).length)
    delete visual.number
  return visual
}

/* —— 数值格式 —— */

export interface MetricNumberParts {
  /** 数值正文（不含前缀 / 紧凑单位） */
  body: string
  /** 紧凑数量级单位：万 / 亿 */
  compactSuffix: string
  /** 无有效数值（展示为 -） */
  empty: boolean
}

export function toFiniteNumber(value: unknown): number | null {
  if (value == null || value === '')
    return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function joinMetricNumber(parts: MetricNumberParts, prefix = '') {
  if (parts.empty)
    return '-'
  return `${prefix}${parts.body}${parts.compactSuffix}`
}

/**
 * 格式化数值部件（前缀由展示层单独渲染）
 * 原值 → 紧凑 → 小数位 → 千分位（紧凑时不加）
 */
export function formatMetricNumber(
  value: number | string | null | undefined,
  style: Pick<ResolvedNumberStyle, 'decimals' | 'separator' | 'compact'>,
): MetricNumberParts {
  if (value == null || value === '')
    return { body: '-', compactSuffix: '', empty: true }

  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n))
    return { body: String(value), compactSuffix: '', empty: true }

  let num = n
  let compactSuffix = ''
  if (style.compact) {
    const abs = Math.abs(n)
    if (abs >= 1e8) {
      num = n / 1e8
      compactSuffix = '亿'
    }
    else if (abs >= 1e4) {
      num = n / 1e4
      compactSuffix = '万'
    }
  }

  const useGrouping = !compactSuffix && style.separator
  return {
    body: formatDecimal(num, style.decimals, useGrouping),
    compactSuffix,
    empty: false,
  }
}

function formatDecimal(
  num: number,
  decimals: NonNullable<VisNumberStyle['decimals']>,
  useGrouping: boolean,
): string {
  if (decimals === 'auto') {
    return new Intl.NumberFormat('zh-CN', {
      useGrouping,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(num)
  }
  return new Intl.NumberFormat('zh-CN', {
    useGrouping,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(num)
}
