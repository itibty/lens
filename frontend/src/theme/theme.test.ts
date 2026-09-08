import type { ISpec } from '@visactor/vchart'
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { describe, expect, it } from 'vitest'
import { DASH_THEME_PRESETS, dashChromeVars, dashOverlayVars, dashThemeVars, resolveDashTheme, resolveDashThemeId } from '@/views/vis/dashboards/dashTheme'
import { buildVChartSpec } from '@/views/vis/shared/cardRenderer'
import { resolveCardChrome } from '@/views/vis/shared/cardTheme'
import { CHART_SERIES_PALETTES, resolveChartSeriesColors } from '@/views/vis/shared/chartPalette'
import { resolveProgressPaint } from '@/views/vis/shared/progressCard'
import { resolveVTableTheme } from '@/views/vis/shared/vtableTheme'
import { themeCssVars } from './cssVars'
import { DARK_THEME, DATA_SERIES, LIGHT_THEME, mixColor, THEME_PRESETS } from './tokens'
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
    for (const colors of [theme, theme.chrome]) {
      for (const background of [colors.surface.page, colors.surface.panel, colors.surface.elevated, colors.heading.background]) {
        for (const text of [colors.text.strong, colors.text.regular, colors.text.muted])
          expect(contrast(text, background), `${text} on ${background}`).toBeGreaterThanOrEqual(4.5)
      }
      for (const paint of [colors.primary, ...Object.values(colors.status)]) {
        expect(contrast(paint.on, paint.base), `${paint.on} on ${paint.base}`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(paint.on, paint.hover), `${paint.on} on ${paint.hover}`).toBeGreaterThanOrEqual(4.5)
        expect(contrast(paint.base, paint.soft), `${paint.base} on ${paint.soft}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('keeps saved theme IDs while distinguishing classic surfaces and category palettes', () => {
    expect(DASH_THEME_PRESETS.map(preset => preset.id)).toEqual(['t1', 't2', 't3', 't4', 't5', 't6'])
    expect(new Set(Object.values(THEME_PRESETS).map(theme => theme.chrome.surface.panel)).size).toBe(6)
    expect(new Set(Object.values(THEME_PRESETS).map(theme => theme.chart.series[0])).size).toBe(6)
    for (const preset of DASH_THEME_PRESETS) {
      const theme = resolveDashTheme(preset.id).theme
      expect(theme.chart.series).toHaveLength(DATA_SERIES.length)
      expect(dashThemeVars(preset.id)['--dash-card-header-bg']).toBe(theme.heading.background)
      expect(dashThemeVars(preset.id)['--dash-chrome-bg']).toBe(theme.chrome.surface.panel)
    }
    expect(THEME_PRESETS.navy.chrome.mode).toBe('dark')
    expect(THEME_PRESETS.navy.mode).toBe('light')
    expect(THEME_PRESETS.paper.surface.panel).not.toBe(LIGHT_THEME.surface.panel)
  })

  it('projects the same theme into page controls and teleported overlays without mutating the global default', () => {
    const before = themeCssVars(LIGHT_THEME)
    const page = dashThemeVars('t6')
    const overlay = dashOverlayVars('t6')
    for (const key of Object.keys(before))
      expect(overlay[key]).toBe(page[key])
    expect(page['--el-color-primary']).toBe(THEME_PRESETS.dark.primary.base)
    expect(overlay['--dash-mobile-surface']).toBe(page['--dash-card-bg'])
    expect(themeCssVars(LIGHT_THEME)).toEqual(before)
    expect(resolveDashThemeId('old-or-unknown')).toBe('t1')
    expect(dashThemeVars('t1', 'lg')['--dash-card-radius']).toBe('16px')
    expect(dashChromeVars('t2')['--el-text-color-primary']).toBe(THEME_PRESETS.navy.chrome.text.strong)
    expect(dashOverlayVars('t2')['--el-text-color-primary']).toBe(THEME_PRESETS.navy.text.strong)
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

  it('keeps default data marks distinguishable from light and dark panels', () => {
    for (const theme of [LIGHT_THEME, DARK_THEME, ...Object.values(THEME_PRESETS)]) {
      for (const color of theme.chart.series)
        expect(contrast(color, theme.surface.panel)).toBeGreaterThanOrEqual(3)
    }
    for (const id of ['CONTRAST', 'COLORBLIND'] as const) {
      const palette = CHART_SERIES_PALETTES.find(item => item.id === id)!.palette
      expect(resolveChartSeriesColors({ chartTheme: id })).toEqual(palette)
      expect(withChartTheme({ type: 'bar', color: palette } as ISpec, true).color).toEqual(palette)
      expect(withChartTheme({ type: 'bar', color: palette } as ISpec, THEME_PRESETS.paper, false).color).toEqual(palette)
    }
  })

  it('switches default charts through every theme without persisting render colors', () => {
    const spec = { type: 'bar', color: [...DATA_SERIES] } as ISpec
    const before = JSON.stringify(spec)
    for (const theme of Object.values(THEME_PRESETS)) {
      expect(withChartTheme(spec, theme, true).color).toEqual(theme.chart.series)
      expect(withChartTheme(spec, theme, false).color).toEqual(DATA_SERIES)
    }
    expect(withChartTheme(spec, THEME_PRESETS.default, true).color).toEqual(DATA_SERIES)
    expect(JSON.stringify(spec)).toBe(before)
  })

  it('adapts default heatmap ramps and gaps while retaining explicitly chosen gradients', () => {
    const query = { datasetId: 'preview', dimensions: [{ field: 'month' }, { field: 'channel' }], metrics: [{ field: 'value' }] }
    const data = { columns: ['month', 'channel', 'value'], rows: [{ month: '1月', channel: '线上', value: 120 }], total: 1, truncated: false }
    const spec = buildVChartSpec('heatmap', query, data, { chartType: 'heatmap' })!
    const before = JSON.stringify(spec)
    const paper = THEME_PRESETS.paper
    expect(withChartTheme(spec, paper, true)).toMatchObject({
      color: { range: [mixColor(paper.primary.base, paper.surface.panel, 0.14), paper.primary.base] },
      cell: { style: { stroke: paper.surface.panel } },
    })
    const gradient = buildVChartSpec('heatmap', query, data, { chartType: 'heatmap', chartTheme: 'WARM_GRADIENT' })!
    expect(withChartTheme(gradient, paper, false).color).toEqual(gradient.color)
    expect(JSON.stringify(spec)).toBe(before)
  })

  it('preserves explicit mark styling and source specs when applying chart defaults', () => {
    const spec = {
      type: 'line',
      point: { style: { size: 10 } },
      theme: { markByName: { point: { style: { size: 7 } }, area: { style: { fillOpacity: 0.4 } } } },
    } as ISpec
    const before = JSON.stringify(spec)
    const themed = withChartTheme(spec)
    expect(themed.theme).toMatchObject({ markByName: { point: { style: { size: 7 } }, area: { style: { fillOpacity: 0.4 } } } })
    expect(themed).toHaveProperty('point.style.size', 10)
    expect(JSON.stringify(spec)).toBe(before)
  })

  it('retains categorical encoding and readable stacked labels with the shared chart palette', () => {
    const query = { datasetId: 'preview', dimensions: [{ field: 'month' }], metrics: [{ field: 'online' }, { field: 'direct' }] }
    const data = {
      columns: ['month', 'online', 'direct'],
      rows: [{ month: '1月', online: 120, direct: 80 }, { month: '2月', online: 150, direct: 100 }],
      total: 2,
      truncated: false,
    }
    const spec = buildVChartSpec('bar', query, data, { chartType: 'bar', chart: { stacked: true, dataLabel: true } })
    expect(spec).toMatchObject({ color: DATA_SERIES, seriesField: '__vis_series', stack: true, label: { smartInvert: true, style: { lineWidth: 0 } } })
    const pie = buildVChartSpec('pie', query, data, { chartType: 'pie' })
    expect(pie).toHaveProperty('pie.state.hover.outerRadius', 0.85)
    expect(pie).toHaveProperty('pie.state.hover.lineWidth', 0)
  })

  it('uses the same readable table surfaces as the surrounding application', () => {
    const light = resolveVTableTheme({ chartType: 'table' })
    const dark = resolveVTableTheme({ chartType: 'table' }, true)
    expect(light.bodyStyle?.color).toBe(LIGHT_THEME.text.strong)
    expect(light.bodyStyle?.bgColor).toBe(LIGHT_THEME.surface.panel)
    expect(dark.bodyStyle?.color).toBe(DARK_THEME.text.strong)
    expect(dark.bodyStyle?.bgColor).toBe(DARK_THEME.surface.panel)
    for (const theme of Object.values(THEME_PRESETS)) {
      const table = resolveVTableTheme({ chartType: 'table' }, theme)
      expect(table.headerStyle?.bgColor).toBe(theme.surface.subtle)
      expect(table.bodyStyle?.color).toBe(theme.text.strong)
      expect(table.bodyStyle?.bgColor).toBe(theme.surface.panel)
    }
    const explicit = { chartType: 'table' as const, chartTheme: 'CONTRAST' as const }
    expect(resolveVTableTheme(explicit, THEME_PRESETS.paper).headerStyle?.bgColor)
      .toBe(resolveVTableTheme(explicit).headerStyle?.bgColor)
  })
})
