import type { DimensionPill, MetricPill, OrderPill } from '../shared/dnd'
import type { VisCard, VisQueryConfig } from '../shared/types'
import { describe, expect, it } from 'vitest'
import { normalizeQueryForRequest } from './cardApi'
import { changeCardChartType, collectQueryIssues } from './chartShape'

const query: VisQueryConfig = {
  datasetId: '1',
  dimensions: [{ field: 'month', label: '月份', timeGrain: 'month', _uid: 'd1' } as DimensionPill],
  metrics: [{ field: 'amount', label: '营收', agg: 'SUM', _uid: 'm1' } as MetricPill, { field: 'cost', label: '成本', formula: 'SUM(cost)', _uid: 'm2' } as MetricPill],
  filters: [{ combineOp: 'and', conditions: [{ field: 'region', op: 'eq', value: ['华东'] }] }],
  havingFilters: [{ field: 'amount', agg: 'SUM', op: 'gt', value: [0] }],
  orderList: [{ field: '月份', dir: 'asc', sourceUid: 'd1', _uid: 'o1' } as OrderPill],
  params: [{ field: 'source', value: ['online'] }],
  limit: 300,
  asOfDate: '2026-09-01',
} as VisQueryConfig

describe('chart conversion', () => {
  it('preserves every query field and editor identity through a round trip', () => {
    const card = { query: structuredClone(query), visual: { chartType: 'bar', chart: { dataLabel: true } } } as VisCard
    const original = structuredClone(card.query)
    const request = normalizeQueryForRequest(card.query, 'bar')
    for (const type of ['line', 'table', 'bar'] as const) {
      changeCardChartType(card, type)
      expect(card.query).toEqual(original)
      expect(normalizeQueryForRequest(card.query, type)).toEqual(request)
      expect(collectQueryIssues(type, card.query)).toEqual([])
    }
  })

  it('rejects invalid active axis ranges, ignoring percent-only ranges and absent axes', () => {
    const visual = { chartType: 'bar', chart: { axes: { primary: { min: 10, max: 1 }, secondary: { min: 10, max: 1 } } } } as VisCard['visual']
    expect(collectQueryIssues('bar', query, undefined, visual).filter(item => item.shelf === 'appearance')).toHaveLength(1)
    visual.chart!.stacked = true
    visual.chart!.percent = true
    expect(collectQueryIssues('bar', query, undefined, visual)).toEqual([])
    visual.chart!.dualAxis = true
    expect(collectQueryIssues('bar', query, undefined, visual).filter(item => item.shelf === 'appearance')).toHaveLength(2)
  })

  it('keeps unsupported dimensions and contrast definitions available for correction', () => {
    const card = { query: structuredClone(query), visual: { chartType: 'table' } } as VisCard
    card.query.dimensions!.push({ field: 'region' }, { field: 'channel' })
    card.query.metrics![0].contrast = { timeField: 'day', calcMethod: 'shift_month', calcType: 'diff', valueExp: 'current_month' }
    const before = structuredClone(card.query)
    changeCardChartType(card, 'line')
    expect(collectQueryIssues('line', card.query).map(item => item.message)).toContain('折线图最多支持 2 个维度')
    expect(collectQueryIssues('line', card.query).map(item => item.message)).toContain('折线图不支持同比 / 环比')
    changeCardChartType(card, 'table')
    expect(card.query).toEqual(before)
  })
})
