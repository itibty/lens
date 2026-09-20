import type { VisCard, VisQueryConfig, VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import { fromVisCardInfo, toVisCardSaveRequest } from '@/views/vis/cards/cardApi'
import { buildVChartSpec } from './cardRenderer'
import { pruneChartVisual } from './chartOptions'
import { fieldStyleKey } from './fieldStyle'

const query: VisQueryConfig = {
  datasetId: '1',
  dimensions: [{ field: 'region' }, { field: 'city' }, { field: 'store' }],
  metrics: [{ field: 'amount', label: '营收', agg: 'SUM' }],
}
const data = {
  columns: ['region', 'city', 'store', '营收'],
  rows: [
    { region: '华东', city: '上海', store: '一店', 营收: 1200 },
    { region: '华东', city: '上海', store: '二店', 营收: 800 },
    { region: '华东', city: '杭州', store: '一店', 营收: 3000 },
    { region: '华南', city: '广州', store: '一店', 营收: 5000 },
  ],
  total: 4,
  truncated: false,
}
function spec(visual: VisVisualConfig, q = query) {
  return buildVChartSpec('treemap', q, data, visual) as Record<string, any>
}

describe('treemap parent levels', () => {
  it.each([2, 3])('shows real parent groups for %s dimensions, independently of leaf labels', (count) => {
    const q = { ...query, dimensions: query.dimensions!.slice(0, count) }
    const visual: VisVisualConfig = { chartType: 'treemap', chart: { treemapParent: true, dataLabel: false } }
    const output = spec(visual, q)
    expect(output).toMatchObject({
      nonLeaf: { visible: true },
      nonLeafLabel: { visible: true, position: 'top', padding: 24 },
      label: { visible: false },
    })
    const parent = output.data[0].values[0]
    expect(output.nonLeafLabel.style.text({ datum: [parent] })).toBe('华东')
    if (count === 3) {
      const child = parent.children[0]
      expect(output.nonLeafLabel.style.text({ datum: [parent, child] })).toBe('上海')
      expect(child.name).toBe('华东 / 上海')
    }
  })

  it('keeps the existing layout by default and hides the synthetic root for one dimension', () => {
    const visual: VisVisualConfig = { chartType: 'treemap' }
    for (const treemapParent of [undefined, false, true]) {
      visual.chart = { treemapParent }
      const output = spec(visual, { ...query, dimensions: query.dimensions!.slice(0, treemapParent ? 1 : 2) })
      expect(output.nonLeaf.visible).toBe(false)
      expect(output.nonLeafLabel.visible).toBe(false)
    }
  })

  it('shows the parent path and aggregate value in tooltips without changing leaf values', () => {
    const visual: VisVisualConfig = {
      chartType: 'treemap',
      chart: { treemapParent: true, dataLabelContent: 'nameValue' },
      fieldStyles: [{ key: fieldStyleKey(query.metrics![0]!), kind: 'metric', format: { decimals: 1, suffix: '元' } }],
    }
    const output = spec(visual)
    const region = output.data[0].values[0]
    const city = region.children[0]
    const parentDatum = { datum: [region, city], value: 2000 }
    expect(output.tooltip.mark.title.value(parentDatum)).toBe('华东 / 上海')
    expect(output.tooltip.mark.content[0].value(parentDatum)).toBe('2,000.0元 (20%)')
    const leaf = city.children[0]
    expect(output.label.formatMethod('', { datum: [region, city, leaf], value: 1200 })).toEqual(['一店', '1,200.0元'])
    expect(output.tooltip.mark.content[0].value(leaf)).toBe('1,200.0元 (12%)')
  })

  it('preserves the switch through save/load and removes it for other chart types', () => {
    const visual: VisVisualConfig = { chartType: 'treemap', chart: { treemapParent: true } }
    const card = { id: '1', name: '营收', query, visual, status: 'EBL' } as VisCard
    const saved = toVisCardSaveRequest(card, query)
    const restored = fromVisCardInfo({ ...saved, id: '1' })
    expect(restored.visual.chart?.treemapParent).toBe(true)
    expect(spec(restored.visual).nonLeafLabel.visible).toBe(true)
    restored.visual.chartType = 'pie'
    pruneChartVisual(restored.visual, query)
    expect(restored.visual.chart?.treemapParent).toBeUndefined()
    visual.chart!.treemapParent = false
    pruneChartVisual(visual, query)
    expect(visual.chart?.treemapParent).toBeUndefined()
  })
})
