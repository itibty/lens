import type { VisQueryConfig } from './types'
import { describe, expect, it } from 'vitest'
import { buildDetailRequest, contextFromDims, contextFromPivotPaths, contextFromTableRow } from './cardDetail'

describe('detail context', () => {
  const query = {
    datasetId: '1',
    dimensions: [{ field: 'region' }],
    metrics: [{ field: 'amount', label: '销售额', agg: 'SUM' }],
    limit: 10,
  } satisfies VisQueryConfig

  it('keeps the selected metric for the context title without reusing Top N', () => {
    const hit = contextFromTableRow(query, { region: '华东', 销售额: 100 }, '销售额')
    expect(hit?.metric).toBe('销售额')
    const request = buildDetailRequest(query, hit)
    expect(request.metric).toBe('销售额')
    expect(request.query.metrics).toEqual(query.metrics)
    expect(request.query.limit).toBeUndefined()
  })

  it('does not turn absent pivot column dimensions into null filters', () => {
    const hit = contextFromPivotPaths({ datasetId: '1', rowDimensions: [{ field: 'region' }], colDimensions: [{ field: 'month' }] }, [{ dimensionKey: 'region', value: '华东' }], [])
    expect(hit.filters).toEqual([{ field: 'region', op: 'eq', value: ['华东'] }])
  })

  it('distinguishes a null value, an empty string and an absent dimension', () => {
    expect(contextFromDims(query.dimensions, { region: null }).filters[0]?.op).toBe('is_null')
    expect(contextFromDims(query.dimensions, { region: '' }).filters[0]).toEqual({ field: 'region', op: 'eq', value: [''] })
    expect(contextFromDims(query.dimensions, {}).filters).toEqual([])
  })

  it('does not offer raw details for contrast metrics', () => {
    const contrastQuery = { ...query, metrics: [{ ...query.metrics[0]!, contrast: { timeField: 'date', calcMethod: 'shift_year', calcType: 'diffRate', valueExp: 'current_month' } }] } satisfies VisQueryConfig
    expect(contextFromTableRow(contrastQuery, { region: '华东' }, '销售额')).toBeNull()
  })
})
