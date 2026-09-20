import type { DimensionPill, MetricPill, OrderPill } from '@/views/vis/shared/dnd'
import type { VisQueryConfig } from '@/views/vis/shared/types'
import { describe, expect, it } from 'vitest'
import { normalizeQueryForRequest } from './cardApi'
import { buildOrderCandidates, createOrderPill, reconcileQueryDependents } from './queryDependents'

describe('sorting by display aliases', () => {
  it('uses the same trimmed aliases for dimensions, formula metrics and sorting', () => {
    const dimensions: DimensionPill[] = [{ _uid: 'd1', field: 'region', label: '  销售 地区  ' }]
    const metrics: MetricPill[] = [{ _uid: 'm1', field: 'amount', label: '  销售额 合计（元）  ', formula: 'SUM(amount)' }]
    const candidates = buildOrderCandidates(dimensions, metrics)
    const query: VisQueryConfig = {
      datasetId: '1',
      dimensions,
      metrics,
      orderList: candidates.map(candidate => createOrderPill(candidate, 'desc')),
    }
    const request = normalizeQueryForRequest(query, 'table')
    expect(request.dimensions?.[0]?.label).toBe('销售 地区')
    expect(request.metrics?.[0]?.label).toBe('销售额 合计（元）')
    expect(request.metrics?.[0]?.formula).toBe('SUM(amount)')
    expect(request.orderList).toEqual([
      { field: '销售 地区', dir: 'desc' },
      { field: '销售额 合计（元）', dir: 'desc' },
    ])
  })

  it('keeps saved sorting with surrounding spaces and no editor identity', () => {
    const request = normalizeQueryForRequest({
      datasetId: '1',
      metrics: [{ field: 'amount', label: '  销售额 合计  ', formula: 'SUM(amount)' }],
      orderList: [{ field: '  销售额 合计  ', dir: 'asc' }],
    }, 'table')
    expect(request.orderList).toEqual([{ field: '销售额 合计', dir: 'asc' }])
  })

  it('follows metric renames and distinguishes formulas built from the same source field', () => {
    const metrics: MetricPill[] = [
      { _uid: 'm1', field: 'amount', label: '销售 合计', formula: 'SUM(amount)' },
      { _uid: 'm2', field: 'amount', label: '销售 均值', formula: 'AVG(amount)' },
    ]
    const orderList = buildOrderCandidates([], metrics).map(candidate => createOrderPill(candidate, 'desc'))
    const query: VisQueryConfig = { datasetId: '1', metrics, orderList }
    metrics[0]!.label = '  销售 合计（元）  '
    reconcileQueryDependents(query, 'table')
    expect((query.orderList as OrderPill[]).map(order => [order.field, order.sourceUid, order.dir]))
      .toEqual([['销售 合计（元）', 'm1', 'desc'], ['销售 均值', 'm2', 'desc']])
  })
})
