/** 表格 / 透视指标单元格展示：配置解析与 VTable 百分比进度属性。 */
import type { VisMetricCellVisual, VisQueryConfig, VisVisualConfig } from './types'
import { ACCENT, alphaColor, LIGHT_THEME, mixColor, NEUTRAL } from '@/theme/tokens'
import { sameCssColor } from './accentPresets'
import { compactCellVisual, resolveMetricStyleRule } from './fieldStyle'
import { metricAlias } from './types'
import { resolveVTableProgressTrackColor } from './vtableTheme'

export const METRIC_PROGRESS_MIN = 0
export const METRIC_PROGRESS_MAX = 100
export const METRIC_PROGRESS_VERTICAL_GAP = 3
export const METRIC_PROGRESS_DEFAULT_COLOR = alphaColor(LIGHT_THEME.chart.series[0], 0.26)

/** 横向数据条使用固定的半透明预设，兼顾色彩识别与上层数字可读性。 */
function dataBarPreset<Id extends keyof typeof ACCENT>(id: Id, label: string) {
  const base = id === 'blue' ? LIGHT_THEME.chart.series[0] : ACCENT[id]
  return { id, label, color: alphaColor(base, 0.26), preview: mixColor(base, NEUTRAL.white, 0.26) }
}

export const METRIC_PROGRESS_COLOR_PRESETS = [
  dataBarPreset('blue', '蓝色'),
  dataBarPreset('cyan', '青色'),
  dataBarPreset('green', '绿色'),
  dataBarPreset('orange', '橙色'),
  dataBarPreset('purple', '紫色'),
] as const

export type MetricProgressColorPresetId = (typeof METRIC_PROGRESS_COLOR_PRESETS)[number]['id']

export function resolveMetricProgressColorPreset(color?: string): MetricProgressColorPresetId | undefined {
  if (!color)
    return 'blue'
  return METRIC_PROGRESS_COLOR_PRESETS.find(item => sameCssColor(color, item.color))?.id
}

export function metricProgressColor(id: MetricProgressColorPresetId) {
  return METRIC_PROGRESS_COLOR_PRESETS.find(item => item.id === id)?.color
}

export function resolveMetricCellVisual(
  visual: VisVisualConfig | undefined,
  query: Pick<VisQueryConfig, 'metrics'> | undefined,
  alias: string,
): VisMetricCellVisual | undefined {
  const metric = (query?.metrics ?? []).find(item => metricAlias(item) === alias)
  return compactCellVisual(resolveMetricStyleRule(visual, metric)?.cellVisual)
}

/**
 * VTable progressbar 会用原始值算条宽、用 format/fieldFormat 画上层文字。
 * 固定 0～100，范围外由 VTable 钳制；轨道和填充上下略微内缩，并位于文字下层。
 */
export function metricProgressVTableConfig(
  visual: VisVisualConfig | undefined,
  query: Pick<VisQueryConfig, 'metrics'> | undefined,
  alias: string,
  dark = false,
) {
  const cell = resolveMetricCellVisual(visual, query, alias)
  if (cell?.type !== 'progress')
    return null
  return {
    define: {
      cellType: 'progressbar' as const,
      min: METRIC_PROGRESS_MIN,
      max: METRIC_PROGRESS_MAX,
      barType: 'default' as const,
    },
    style: {
      barHeight: '100%',
      barBottom: 0,
      barPadding: [METRIC_PROGRESS_VERTICAL_GAP, 0],
      barColor: cell.color || METRIC_PROGRESS_DEFAULT_COLOR,
      barBgColor: resolveVTableProgressTrackColor(dark),
    },
  }
}

interface ProgressBarAnimate {
  wait: (delay: number) => {
    from: (attrs: { width: number }, duration: number, easing: 'cubicOut') => unknown
  }
}

interface ProgressBarGraphic {
  attribute?: { width?: unknown }
  animate?: (params?: { id?: string }) => ProgressBarAnimate
}

interface ProgressBarGroup {
  getChildren?: () => ProgressBarGraphic[]
}

interface ProgressBarCell {
  getChildByName?: (name: string, deep?: boolean) => ProgressBarGroup | undefined
}

interface MetricProgressAnimationTable {
  getCellType: (col: number, row: number) => string
  scenegraph: {
    bodyColStart: number
    bodyColEnd: number
    bodyRowStart: number
    bodyRowEnd: number
    highPerformanceGetCell: (col: number, row: number) => ProgressBarCell | undefined
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 仅让高亮填充从 0 增长到目标宽度；轨道和上层文字保持稳定。 */
export function animateMetricProgressBars(
  table: MetricProgressAnimationTable,
  reducedMotion = prefersReducedMotion(),
) {
  if (reducedMotion)
    return 0

  const scene = table.scenegraph
  let animated = 0
  for (let row = scene.bodyRowStart; row <= scene.bodyRowEnd; row++) {
    for (let col = scene.bodyColStart; col <= scene.bodyColEnd; col++) {
      if (table.getCellType(col, row) !== 'progressbar')
        continue
      const progress = scene.highPerformanceGetCell(col, row)?.getChildByName?.('progress-bar')
      const fill = progress?.getChildren?.().at(-1)
      const width = Number(fill?.attribute?.width)
      if (!(width > 0) || !fill?.animate)
        continue
      fill.animate({ id: 'lens-metric-progress-appear' })
        .wait(Math.min((row - scene.bodyRowStart) * 14, 126))
        .from({ width: 0 }, 420, 'cubicOut')
      animated++
    }
  }
  return animated
}
