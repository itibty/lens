import type { VisQueryConfig, VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import { DARK_THEME, LIGHT_THEME } from '@/theme/tokens'
import { withChartTheme } from '@/theme/vchart'
import { buildVChartSpec } from './cardRenderer'
import { axisBoundsIssue } from './chartAxes'
import { pruneChartVisual } from './chartOptions'
import { remapSeriesAlias, sanitizeSeriesStyles, seriesCandidates, seriesTargetKey } from './chartSeriesStyle'
import { sanitizeMarkLines } from './markLine'

const query: VisQueryConfig = { datasetId: '1', dimensions: [{ field: 'month' }], metrics: [{ field: 'revenue', label: '营收', agg: 'SUM' }, { field: 'cost', label: '成本', agg: 'SUM' }] }
const data = { columns: ['month', '营收', '成本'], total: 2, truncated: false, rows: [{ month: '一月', 营收: 100, 成本: 40 }, { month: '二月', 营收: 110, 成本: 45 }] }
function spec(visual: VisVisualConfig, q = query) {
  return buildVChartSpec(visual.chartType, q, data, visual) as Record<string, any>
}

describe('mark line settings', () => {
  it('persists appearance and applies it to the selected metric without changing the statistic', () => {
    const visual: VisVisualConfig = { chartType: 'combo', chart: { dualAxis: true, markLines: [
      { kind: 'avg', field: '成本', label: '成本均值', style: { color: '#d4380d', lineStyle: 'solid', lineWidth: 4 } },
    ] } }
    pruneChartVisual(visual, query)
    expect(visual.chart?.markLines?.[0]?.style).toEqual({ color: '#d4380d', lineStyle: 'solid', lineWidth: 4 })
    const output = spec(visual)
    const line = output.markLine[0]
    expect(line).toMatchObject({ y: 42.5, label: { text: '成本均值', style: { fill: '#d4380d' } }, line: { style: { stroke: '#d4380d', lineDash: [], lineWidth: 4 } } })
    expect(line.relativeSeriesId).toBe(output.series.find((item: any) => item.type === 'line').id)
  })

  it('keeps fixed horizontal lines and their dotted style through metric renames', () => {
    const visual: VisVisualConfig = { chartType: 'bar', chart: { orientation: 'horizontal', markLines: [
      { kind: 'fixed', field: '成本', value: 50, style: { lineStyle: 'dotted', lineWidth: 1 } },
    ] } }
    remapSeriesAlias(visual, '成本', '支出')
    expect(visual.chart?.markLines?.[0]).toMatchObject({ field: '支出', style: { lineStyle: 'dotted', lineWidth: 1 } })
    remapSeriesAlias(visual, '支出', '成本')
    expect(spec(visual).markLine[0]).toMatchObject({ x: 50, line: { style: { lineDash: [2, 3], lineWidth: 1 } } })
  })

  it('ignores invalid appearance and supports clearing a custom color', () => {
    expect(sanitizeMarkLines([{ kind: 'avg', style: { color: 'invalid', lineStyle: 'invalid', lineWidth: 99 } }], ['营收'])).toEqual([{ kind: 'avg' }])
    expect(sanitizeMarkLines([{ kind: 'avg', style: { color: null, lineStyle: 'solid' } }], ['营收'])).toEqual([{ kind: 'avg', style: { lineStyle: 'solid' } }])
  })

  it('keeps an empty fixed value editable without rendering it as zero', () => {
    for (const value of [null, '', undefined]) {
      const lines = [{ kind: 'fixed', value }]
      expect(sanitizeMarkLines(lines, ['营收'], { keepIncomplete: true })).toEqual([{ kind: 'fixed' }])
      expect(sanitizeMarkLines(lines, ['营收'])).toEqual([])
    }
    expect(sanitizeMarkLines([{ kind: 'fixed', value: 0 }], ['营收'])).toEqual([{ kind: 'fixed', value: 0 }])
  })

  it('uses theme colors for existing lines and preserves explicit colors in dark mode', () => {
    const visual: VisVisualConfig = { chartType: 'line', chart: { markLines: [{ kind: 'max' }, { kind: 'min', style: { color: '#ff0000' } }] } }
    for (const theme of [LIGHT_THEME, DARK_THEME]) {
      const output = withChartTheme(spec(visual) as any, theme) as any
      expect(output.markLine[0]).toMatchObject({ y: 110, line: { style: { lineWidth: 2 } } })
      expect(output.markLine[0].line.style.stroke).toBeUndefined()
      expect(output.markLine[0].label.style.fill).toBeUndefined()
      expect(output.theme.colorScheme.default.palette.markLineStrokeColor).toBe(theme.text.muted)
      expect(output.markLine[1].line.style.stroke).toBe('#ff0000')
    }
  })
})

describe('series settings', () => {
  it('matches aliases independently of order, then follows renames', () => {
    const visual: VisVisualConfig = { chartType: 'line', chart: { seriesStyles: [{ metric: '成本', style: { color: '#ff0000', lineStyle: 'dashed', lineWidth: 4, points: false, dataLabel: true } }] } }
    const output = spec(visual, { ...query, metrics: [...query.metrics!].reverse() })
    expect(output.color.specified).toEqual({ 成本: '#ff0000' })
    expect(output.line.style.lineDash({ __vis_series: '成本' })).toEqual([6, 4])
    expect(output.line.style.lineDash({ __vis_series: '营收' })).toEqual([])
    expect(output.point.style.visible({ __vis_series: '成本' })).toBe(false)
    const labels = [{ data: { __vis_series: '成本' } }, { data: { __vis_series: '营收' } }]
    expect(output.label.visible).toBe(true)
    expect(output.label.dataFilter(labels)).toEqual([labels[0]])
    remapSeriesAlias(visual, '成本', '支出')
    expect(visual.chart?.seriesStyles?.[0]).toMatchObject({ metric: '支出' })
  })

  it('keeps category rules when filtered out and distinguishes typed values', () => {
    const q = { ...query, metrics: [query.metrics![0]], dimensions: [{ field: 'month' }, { field: 'channel', label: '渠道' }] }
    const rules = sanitizeSeriesStyles([{ dimension: 'channel', value: '直营', style: { color: '#123456' } }], q)
    expect(seriesCandidates(q, [{ 渠道: '加盟' }], rules).map(item => item.label)).toEqual(['加盟', '直营'])
    expect(seriesTargetKey({ dimension: 'channel', value: 1 })).not.toEqual(seriesTargetKey({ dimension: 'channel', value: '1' }))
    expect(sanitizeSeriesStyles(rules, { ...q, dimensions: [{ field: 'month' }, { field: 'region' }] })).toEqual([])
  })

  it('preserves explicit colors with dashboard theme palettes and clears defaults', () => {
    const visual: VisVisualConfig = { chartType: 'line', chart: { seriesStyles: [{ metric: '成本', style: { color: '#ff0000' } }] } }
    const themed = withChartTheme(spec(visual) as any, undefined, true) as any
    expect(themed.color.specified).toEqual({ 成本: '#ff0000' })
    visual.chart!.seriesStyles = []
    const reset = spec(visual)
    expect(reset.color.specified).toEqual({})
    expect(reset.point.style.visible({ __vis_series: '成本' })).toBe(true)
    expect(reset.line.style.lineDash({ __vis_series: '成本' })).toEqual([])
  })

  it('applies line settings only to line geometries in a combination chart', () => {
    const output = spec({ chartType: 'combo', chart: { seriesStyles: [{ metric: '成本', style: { lineWidth: 4, dataLabel: true } }] } })
    const bar = output.series.find((item: any) => item.type === 'bar')
    const line = output.series.find((item: any) => item.type === 'line')
    expect(bar.line).toBeUndefined()
    expect(line.line.style.lineWidth({ __vis_series: '成本' })).toBe(4)
    expect(line.label.formatMethod('', { __vis_series: '成本', __vis_value: 40 })).toBe('40')
  })
})

describe('axis settings', () => {
  it('maps horizontal category and two value axes and restores automatic ranges', () => {
    const visual: VisVisualConfig = { chartType: 'bar', chart: { dualAxis: true, orientation: 'horizontal', axes: {
      category: { showTitle: true, title: '月份' },
      primary: { min: -10, max: 200, title: '收入', showTitle: true },
      secondary: { zero: 'data' },
    } } }
    const output = spec(visual)
    expect(output.axes.find((axis: any) => axis.orient === 'left').title).toEqual({ visible: true, text: '月份' })
    expect(output.axes.find((axis: any) => axis.orient === 'bottom')).toMatchObject({ min: -10, max: 200, zero: false, nice: false })
    expect(output.axes.find((axis: any) => axis.orient === 'top')).toMatchObject({ zero: false })
    delete visual.chart!.axes
    const restored = spec(visual).axes.find((axis: any) => axis.orient === 'bottom')
    expect(restored.min).toBeUndefined()
    expect(restored.max).toBeUndefined()
  })

  it('ignores bounds on percent stacks and does not add empty axes', () => {
    const pct = spec({ chartType: 'bar', chart: { stacked: true, percent: true, axes: { primary: { min: 20, max: 30 } } } })
    expect(pct.axes.find((axis: any) => axis.orient === 'left').min).toBeUndefined()
    const onlySecondary = spec({ chartType: 'combo', chart: { secondaryFields: ['营收', '成本'] } })
    expect(onlySecondary.axes.map((axis: any) => axis.orient)).toEqual(['bottom', 'right'])
    expect(axisBoundsIssue({ min: 10, max: 10 })).toBeTruthy()
    expect(axisBoundsIssue({ min: Number.NaN })).toBeTruthy()
  })

  it('persists valid settings while pruning unsupported chart types', () => {
    const visual: VisVisualConfig = { chartType: 'line', chart: { axes: { primary: { title: '元', min: 0 } }, seriesStyles: [{ metric: '成本', style: { points: false } }, { metric: '已删除', style: { points: true } }] } }
    pruneChartVisual(visual, query)
    expect(visual.chart!.seriesStyles).toHaveLength(1)
    expect(visual.chart!.axes?.primary).toEqual({ title: '元', min: 0 })
    visual.chartType = 'pie'
    pruneChartVisual(visual, query)
    expect(visual.chart?.axes).toBeUndefined()
    expect(visual.chart?.seriesStyles).toBeUndefined()
  })
})
