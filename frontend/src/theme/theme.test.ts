import type { ISpec } from '@visactor/vchart'
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { describe, expect, it } from 'vitest'
import { dashOverlayVars, dashThemeVars, resolveDashThemeId } from '@/views/vis/dashboards/dashTheme'
import { resolveCardChrome } from '@/views/vis/shared/cardTheme'
import { resolveProgressPaint } from '@/views/vis/shared/progressCard'
import { resolveVTableTheme } from '@/views/vis/shared/vtableTheme'
import { themeCssVars } from './cssVars'
import { DARK_THEME, DATA_SERIES, LIGHT_THEME, THEME_PRESETS } from './tokens'
import { withChartTheme } from './vchart'

function luminance(hex: string) {
  const linear = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)]
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)
}

describe('lens theme contract', () => {
  it.each(Object.entries(THEME_PRESETS))('%s keeps reading text and action labels legible', (_name, theme) => {
    for (const background of [theme.surface.page, theme.surface.panel, theme.surface.elevated]) {
      for (const text of [theme.text.strong, theme.text.regular, theme.text.muted])
        expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5)
    }
    for (const paint of [theme.primary, ...Object.values(theme.status)]) {
      expect(contrast(paint.on, paint.base)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(paint.on, paint.hover)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(paint.base, paint.soft)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('projects the same theme into page controls and teleported overlays without mutating the global default', () => {
    const before = themeCssVars(LIGHT_THEME)
    const page = dashThemeVars('t6')
    const overlay = dashOverlayVars('t6')
    for (const key of Object.keys(before))
      expect(overlay[key]).toBe(page[key])
    expect(page['--el-color-primary']).toBe(DARK_THEME.primary.base)
    expect(overlay['--dash-mobile-surface']).toBe(page['--dash-card-bg'])
    expect(themeCssVars(LIGHT_THEME)).toEqual(before)
    expect(resolveDashThemeId('old-or-unknown')).toBe('t1')
    expect(dashThemeVars('t1', 'lg')['--dash-card-radius']).toBe('16px')
  })

  it('keeps saved custom paint and the input configuration intact', () => {
    const visual: VisVisualConfig = {
      chartType: 'progress',
      cardBg: '#123456',
      cardColor: '#ABCDEF',
      progress: { color: '#52C41A', trackColor: '#F6FFED' },
    }
    const before = JSON.stringify(visual)
    expect(resolveCardChrome(visual)).toEqual({ bg: '#123456', color: '#ABCDEF' })
    expect(resolveProgressPaint(visual)).toEqual({ fill: '#52C41A', track: '#F6FFED' })
    expect(JSON.stringify(visual)).toBe(before)
    expect(resolveProgressPaint()).toEqual({ fill: 'var(--na-chart-accent)', track: 'var(--na-chart-track)' })
  })

  it('adapts default charts to dark surfaces and restores light colors without modifying source specs', () => {
    const spec = { type: 'bar', color: [...DATA_SERIES] } as ISpec
    const dark = withChartTheme(spec, true)
    const light = withChartTheme(spec)
    expect(dark.color).toEqual(DARK_THEME.chart.series)
    expect(light.color).toEqual(DATA_SERIES)
    expect(spec).toEqual({ type: 'bar', color: DATA_SERIES })
    const colors = ['#123456', '#ABCDEF']
    const custom = withChartTheme({ type: 'bar', color: colors } as ISpec, true)
    expect(custom.color).toEqual(colors)
  })

  it('uses the same readable table surfaces as the surrounding application', () => {
    const light = resolveVTableTheme({ chartType: 'table' })
    const dark = resolveVTableTheme({ chartType: 'table' }, true)
    expect(light.bodyStyle?.color).toBe(LIGHT_THEME.text.strong)
    expect(light.bodyStyle?.bgColor).toBe(LIGHT_THEME.surface.panel)
    expect(dark.bodyStyle?.color).toBe(DARK_THEME.text.strong)
    expect(dark.bodyStyle?.bgColor).toBe(DARK_THEME.surface.panel)
  })
})
