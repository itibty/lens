import type { ISpec } from '@visactor/vchart'
import { darkTheme, lightTheme } from '@visactor/vchart'
import { FONT_SANS } from '@/core/fonts'
import { DARK_THEME, DATA_SERIES, LIGHT_THEME } from './tokens'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

/** 几何图默认视觉权重；仅补主题默认值，保留显式主题和业务 spec 的覆盖。 */
const CHART_MARK_STYLES: Record<string, Record<string, unknown>> = {
  point: { size: 5 },
  area: { fillOpacity: 0.12 },
}

function chartMarks(base: unknown, current: unknown) {
  const baseMarks = record(base)
  const currentMarks = record(current)
  const result = { ...baseMarks, ...currentMarks }
  for (const [name, style] of Object.entries(CHART_MARK_STYLES)) {
    const defaults = record(baseMarks[name])
    const custom = record(currentMarks[name])
    result[name] = {
      ...defaults,
      ...custom,
      style: { ...record(defaults.style), ...style, ...record(custom.style) },
    }
  }
  return result
}

/** VChart 原生颜色槽适配：坐标轴、图例、提示层统一随表面切换，业务 spec 的显式主题仍优先。 */
export function withChartTheme(spec: ISpec, dark = false): ISpec {
  const lens = dark ? DARK_THEME : LIGHT_THEME
  const base = (dark ? darkTheme : lightTheme) as unknown as Record<string, unknown>
  const source = spec as unknown as Record<string, unknown>
  const current = record(source.theme)
  const baseScheme = record(record(base.colorScheme).default)
  const currentScheme = record(record(current.colorScheme).default)
  const palette = {
    ...record(baseScheme.palette),
    backgroundColor: lens.surface.panel,
    borderColor: lens.border.light,
    hoverBackgroundColor: lens.surface.hover,
    popupBackgroundColor: lens.surface.elevated,
    primaryFontColor: lens.text.strong,
    secondaryFontColor: lens.text.regular,
    tertiaryFontColor: lens.text.muted,
    axisLabelFontColor: lens.chart.axis,
    disableFontColor: lens.text.disabled,
    axisGridColor: lens.chart.grid,
    axisDomainColor: lens.border.light,
    markLineStrokeColor: lens.text.muted,
    markLabelBackgroundColor: lens.surface.subtle,
    dangerColor: lens.status.danger.base,
    warningColor: lens.status.warning.base,
    successColor: lens.status.success.base,
    infoColor: lens.primary.base,
    ...record(currentScheme.palette),
  }
  const result: Record<string, unknown> = {
    ...source,
    theme: {
      ...base,
      fontFamily: FONT_SANS,
      ...current,
      colorScheme: {
        ...record(base.colorScheme),
        ...record(current.colorScheme),
        default: { ...baseScheme, dataScheme: lens.chart.series, ...currentScheme, palette },
      },
      component: { ...record(base.component), ...record(current.component) },
      series: { ...record(base.series), ...record(current.series) },
      markByName: chartMarks(base.markByName, current.markByName),
    },
  }
  // 只替换渲染器产生的默认系列；高对比、易辨色和显式系列色保持原样。
  if (Array.isArray(source.color) && source.color.length === DATA_SERIES.length
    && source.color.every((color, index) => color === DATA_SERIES[index])) {
    result.color = [...lens.chart.series]
  }

  if (source.indicator) {
    const indicator = record(source.indicator)
    const textBlock = (value: unknown, fallback: string) => {
      const block = record(value)
      const style = record(block.style)
      const fill = style.fill === LIGHT_THEME.text.strong || style.fill === LIGHT_THEME.text.regular
        ? fallback
        : style.fill ?? fallback
      return { ...block, style: { ...style, fill } }
    }
    result.indicator = {
      ...indicator,
      title: textBlock(indicator.title, lens.text.strong),
      content: Array.isArray(indicator.content)
        ? indicator.content.map(item => textBlock(item, lens.text.regular))
        : indicator.content,
    }
  }
  return result as unknown as ISpec
}
