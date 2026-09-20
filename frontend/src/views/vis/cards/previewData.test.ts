import type { VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { describe, expect, it } from 'vitest'
import { previewDataKey } from './previewData'

const query: VisQueryConfig = {
  datasetId: '1',
  dimensions: [{ field: 'region' }],
  metrics: [{ field: 'amount', agg: 'SUM' }],
}

describe('preview data dependencies', () => {
  it.each<Partial<VisVisualConfig>>([
    { showTitle: true, title: '销售额', showDescription: true, description: '本月' },
    { cardColor: '#333333', cardBg: '#ffffff' },
    { fieldStyles: [{ key: 'm:amount:SUM', kind: 'metric', format: { decimals: 2, signColor: 'positive-red' } }] },
    { chart: { axes: { primary: { min: 10, max: 1 } }, legend: true, dataLabel: true } },
    { number: { showLabel: true }, progress: { target: 100 } },
    { allowDetail: true, detail: { fields: ['region'], limit: 50 }, allowDownload: true, autoRefreshSec: 60 },
  ])('does not requery for presentation or interaction configuration: %j', (patch) => {
    expect(previewDataKey(query, { chartType: 'bar', ...patch }))
      .toBe(previewDataKey(query, { chartType: 'bar' }))
  })

  it.each<Partial<VisQueryConfig>>([
    { datasetId: '2' },
    { dimensions: [{ field: 'channel' }] },
    { metrics: [{ field: 'amount', agg: 'AVG' }] },
    { metrics: [{ field: 'amount', formula: 'SUM(amount) / 100' }] },
    { filters: [{ combineOp: 'and', conditions: [{ field: 'region', op: 'eq', value: ['华东'] }] }] },
    { orderList: [{ field: 'amount', dir: 'desc' }] },
    { havingFilters: [{ field: 'amount', agg: 'SUM', op: 'gt', value: [100] }] },
    { params: [{ field: 'source', value: ['web'] }] },
    { limit: 100 },
    { asOfDate: '2026-09-18' },
  ])('requeries when data parameters change: %j', (patch) => {
    expect(previewDataKey({ ...query, ...patch }, { chartType: 'bar' }))
      .not
      .toBe(previewDataKey(query, { chartType: 'bar' }))
  })

  it.each(['rowSubtotal', 'rowTotal', 'columnSubtotal', 'columnTotal'] as const)('includes pivot %s in data dependencies', (option) => {
    const pivotQuery = { ...query, rowDimensions: [{ field: 'region' }], colDimensions: [{ field: 'month' }] }
    const base = previewDataKey(pivotQuery, { chartType: 'pivot' })
    expect(previewDataKey(pivotQuery, { chartType: 'pivot', [option]: false })).toBe(base)
    expect(previewDataKey(pivotQuery, { chartType: 'pivot', [option]: true })).not.toBe(base)
    expect(previewDataKey(query, { chartType: 'bar', [option]: true }))
      .toBe(previewDataKey(query, { chartType: 'bar' }))
  })

  it('ignores editor identities but includes chart type and metric aliases', () => {
    const draft = structuredClone(query)
    Object.assign(draft.metrics![0]!, { _uid: 'm1' })
    Object.assign(draft.dimensions![0]!, { _uid: 'd1' })
    expect(previewDataKey(draft, { chartType: 'bar' })).toBe(previewDataKey(query, { chartType: 'bar' }))
    expect(previewDataKey(draft, { chartType: 'line' })).not.toBe(previewDataKey(query, { chartType: 'bar' }))
    draft.metrics![0]!.label = '销售额'
    expect(previewDataKey(draft, { chartType: 'bar' })).not.toBe(previewDataKey(query, { chartType: 'bar' }))
  })
})
