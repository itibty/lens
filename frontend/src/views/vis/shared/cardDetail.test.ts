import type { VisQueryConfig } from './types'
import { describe, expect, it } from 'vitest'
import { buildDetailRequest, contextFromChartDatum, contextFromDims, contextFromPivotPaths, contextFromTableRow } from './cardDetail'

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

  it('uses original treemap dimension values for parent and leaf details', () => {
    const q = { ...query, dimensions: [{ field: 'region' }, { field: 'city' }, { field: 'storeId' }] }
    const region = { name: '华东 / 沿海', region: '华东 / 沿海' }
    const city = { ...region, name: '华东 / 沿海 / 上海', city: '上海' }
    const store = { ...city, name: '华东 / 沿海 / 上海 / 12', storeId: 12 }
    const regionFilter = { field: 'region', op: 'eq', value: ['华东 / 沿海'] }
    const cityFilter = { field: 'city', op: 'eq', value: ['上海'] }
    expect(contextFromChartDatum(q, { name: region.name, datum: [region], depth: 0 })?.filters).toEqual([regionFilter])
    expect(contextFromChartDatum(q, { name: city.name, datum: [region, city], depth: 1 })?.filters).toEqual([regionFilter, cityFilter])
    expect(contextFromChartDatum(q, { name: store.name, datum: [region, city, store], depth: 2 })?.filters)
      .toEqual([regionFilter, cityFilter, { field: 'storeId', op: 'eq', value: [12] }])
  })
})
