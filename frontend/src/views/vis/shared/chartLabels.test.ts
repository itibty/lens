import type { ChartType, VisCard, VisChartLabelContent, VisQueryConfig, VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import { fromVisCardInfo, toVisCardSaveRequest } from '@/views/vis/cards/cardApi'
import { buildVChartSpec } from './cardRenderer'
import { chartLabelConfig, resolveChartLabelContent } from './chartLabels'
import { pruneChartVisual } from './chartOptions'
import { fieldStyleKey } from './fieldStyle'

const query: VisQueryConfig = {
  datasetId: '1',
  dimensions: [{ field: 'region' }],
  metrics: [{ field: 'amount', label: '营收', agg: 'SUM' }],
}
const rows = [{ region: '华东', city: '上海', 营收: 1200, 成本: 400 }, { region: '华南', city: '广州', 营收: 800, 成本: 300 }]
const data = { columns: ['region', 'city', '营收', '成本'], rows, total: 2, truncated: false }
function visual(chartType: ChartType, content?: VisChartLabelContent): VisVisualConfig {
  return {
    chartType,
    chart: { dataLabel: true, dataLabelContent: content },
    fieldStyles: [{ key: fieldStyleKey(query.metrics![0]!), kind: 'metric', format: { decimals: 1, suffix: '元' } }],
  }
}
function spec(v: VisVisualConfig, q = query) {
  return buildVChartSpec(v.chartType, q, data, v) as Record<string, any>
}

describe('chart label content', () => {
  it.each([
    [undefined, ['华东', '60%']],
    ['name', '华东'],
    ['value', '1,200.0元'],
    ['nameValue', ['华东', '1,200.0元']],
    ['percent', '60%'],
    ['namePercent', ['华东', '60%']],
  ] as const)('renders pie content %s independently from metric formatting', (content, expected) => {
    const v = visual('pie', content)
    for (const donut of [false, true]) {
      v.chart!.donut = donut
      expect(spec(v).label.formatMethod('', rows[0])).toEqual(expected)
    }
  })

  it('formats funnel values and keeps conversion labels independent', () => {
    const v = visual('funnel')
    expect(spec(v).label.formatMethod('', rows[0])).toEqual(['华东', '1,200.0元'])
    v.chart!.dataLabelContent = 'value'
    expect(spec(v).label.formatMethod('', rows[0])).toBe('1,200.0元')
    v.chart!.dataLabelContent = 'name'
    expect(spec(v).label.formatMethod('', rows[0])).toBe('华东')
    v.chart!.dataLabel = false
    v.chart!.showRate = true
    expect(spec(v)).toMatchObject({ label: { visible: false }, transformLabel: { visible: true } })
  })

  it('uses the leaf name and metric format for nested treemap layout data', () => {
    const q = { ...query, dimensions: [...query.dimensions!, { field: 'city' }] }
    const v = visual('treemap')
    const output = spec(v, q)
    const parent = output.data[0].values[0]
    const leaf = parent.children[0]
    const layoutNode = { value: 1200, datum: [parent, leaf], depth: 1 }
    expect(output.label.formatMethod('', layoutNode)).toBe('上海')
    v.chart!.dataLabelContent = 'nameValue'
    expect(spec(v, q).label.formatMethod('', layoutNode)).toEqual(['上海', '1,200.0元'])
    v.chart!.dataLabelContent = 'value'
    expect(spec(v, q).label.formatMethod('', { ...leaf, value: 0 })).toBe('0.0元')
  })

  it('identifies scatter points by name or both formatted metrics, including after removing the dimension', () => {
    const q = { ...query, metrics: [...query.metrics!, { field: 'cost', label: '成本', agg: 'SUM' as const }] }
    const v = visual('scatter')
    v.fieldStyles!.push({ key: fieldStyleKey(q.metrics[1]!), kind: 'metric', format: { suffix: '件' } })
    expect(spec(v, q).label.formatMethod('', rows[0])).toBe('华东')
    v.chart!.dataLabelContent = 'value'
    const values = ['营收：1,200.0元', '成本：400件']
    expect(spec(v, q).label.formatMethod('', rows[0])).toEqual(values)
    v.chart!.dataLabelContent = 'nameValue'
    expect(spec(v, q).label.formatMethod('', rows[0])).toEqual(['华东', ...values])
    q.dimensions = []
    expect(spec(v, q).label.formatMethod('', rows[0])).toEqual(values)
    expect(chartLabelConfig('scatter', q)?.options).toEqual(['value'])
    pruneChartVisual(v, q)
    expect(v.chart?.dataLabelContent).toBeUndefined()
  })

  it.each(['bar', 'line', 'combo', 'radar', 'heatmap', 'waterfall'] as const)('keeps %s labels numeric', (type) => {
    const q = {
      ...query,
      dimensions: type === 'heatmap' ? [...query.dimensions!, { field: 'city' }] : query.dimensions,
      metrics: type === 'combo' ? [...query.metrics!, { field: 'cost', label: '成本', agg: 'SUM' as const }] : query.metrics,
    }
    const output = spec(visual(type, 'name'), q)
    const label = output.series?.[0]?.label ?? output.label
    expect(label.formatMethod('', output.data[0].values[0])).toBe('1,200.0元')
    expect(chartLabelConfig(type, q)).toBeUndefined()
  })

  it('retains percentage labels for percent bars', () => {
    const q = { ...query, metrics: [...query.metrics!, { field: 'cost', label: '成本', agg: 'SUM' as const }] }
    const v = visual('bar')
    Object.assign(v.chart!, { stacked: true, percent: true })
    const output = spec(v, q)
    expect(output.label.formatMethod('', { __VCHART_STACK_START_PERCENT: 0, __VCHART_STACK_END_PERCENT: 0.75 })).toBe('75%')
  })

  it('preserves selected content through saving, loading and disabling labels', () => {
    const v = visual('pie', 'nameValue')
    v.chart!.dataLabel = false
    const card = { id: '1', name: '营收', query, visual: v, status: 'EBL' } as VisCard
    const saved = toVisCardSaveRequest(card, query)
    const restored = fromVisCardInfo({ ...saved, id: '1' })
    expect(restored.visual.chart).toMatchObject({ dataLabel: false, dataLabelContent: 'nameValue' })
    restored.visual.chart!.dataLabel = true
    expect(spec(restored.visual).label.formatMethod('', rows[0])).toEqual(['华东', '1,200.0元'])
  })

  it('prunes defaults and unsupported content when the chart type changes', () => {
    const v = visual('pie', 'percent')
    v.chartType = 'funnel'
    expect(resolveChartLabelContent(v, 'funnel', query)).toBe('nameValue')
    pruneChartVisual(v, query)
    expect(v.chart?.dataLabelContent).toBeUndefined()
    v.chart!.dataLabelContent = 'nameValue'
    v.chartType = 'bar'
    pruneChartVisual(v, query)
    expect(v.chart?.dataLabelContent).toBeUndefined()
  })
})
