import type { VisQueryConfig, VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import { buildDetailRequest, contextFromChartDatum, contextFromDims, contextFromPivotPaths, contextFromTableRow, detailMenuLabel } from './cardDetail'
import { buildVChartSpec } from './cardRenderer'
import { unwrapChartDatum } from './chartDatum'

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

describe('chart detail metrics', () => {
  const query: VisQueryConfig = {
    datasetId: '1',
    dimensions: [{ field: 'order_date', label: '日期', timeGrain: 'day' }],
    metrics: [
      { field: 'revenue', label: 'Revenue', agg: 'SUM' },
      { field: 'profit', label: 'Gross profit', agg: 'SUM' },
    ],
  }
  const data: VIS.QueryDataResponse = {
    columns: ['日期', 'Revenue', 'Gross profit'],
    rows: [{ '日期': '2026-08-31', 'Revenue': 350, 'Gross profit': 110 }],
    total: 1,
    truncated: false,
  }
  const visuals: VisVisualConfig[] = [
    { chartType: 'line', chart: { stacked: false } },
    { chartType: 'line', chart: { stacked: true } },
    { chartType: 'line', chart: { area: true, stacked: false } },
    { chartType: 'line', chart: { area: true, stacked: true } },
    { chartType: 'line', chart: { dualAxis: true } },
    { chartType: 'bar', chart: { stacked: false } },
    { chartType: 'bar', chart: { stacked: true } },
    { chartType: 'combo' },
    { chartType: 'radar' },
  ]

  it.each(visuals)('keeps the clicked metric and date for %j', (visual) => {
    const spec = buildVChartSpec(visual.chartType, query, data, visual) as unknown as {
      data: { values: Record<string, unknown>[] }[]
    }
    const values = spec.data.flatMap(set => set.values)
    for (const metric of ['Revenue', 'Gross profit']) {
      const datum = values.find(row => row.__vis_series === metric)
      expect(datum).toBeDefined()
      const hit = contextFromChartDatum(query, datum)
      expect(hit).toEqual({
        metric,
        filters: [{ field: 'order_date', op: 'eq', value: ['2026-08-31'], timeGrain: 'day' }],
        labels: ['2026-08-31'],
      })
      expect(detailMenuLabel(hit!)).toBe(`查看明细（2026-08-31 · ${metric}）`)
      expect(buildDetailRequest(query, hit)).toMatchObject({ metric, contextFilters: hit!.filters })
    }
  })

  it('retains the series identity when a line or area click carries an array of points', () => {
    const points = [
      { 日期: '2026-08-30', __vis_series: 'Revenue', __vis_value: 300 },
      { 日期: '2026-08-31', __vis_series: 'Revenue', __vis_value: 350 },
    ]
    expect(contextFromChartDatum(query, unwrapChartDatum(points))?.metric).toBe('Revenue')
    expect(contextFromChartDatum(query, { data: points[0] })?.metric).toBe('Revenue')
  })

  it('preserves dimension-based series without confusing a dimension value with a metric', () => {
    const groupedQuery: VisQueryConfig = {
      ...query,
      dimensions: [...query.dimensions!, { field: 'region' }],
      metrics: [query.metrics![0]!],
    }
    const hit = contextFromChartDatum(groupedQuery, { 日期: '2026-08-31', region: 'Revenue', Revenue: 350 })
    expect(hit?.filters).toEqual([
      { field: 'order_date', op: 'eq', value: ['2026-08-31'], timeGrain: 'day' },
      { field: 'region', op: 'eq', value: ['Revenue'] },
    ])
    expect(hit?.metric).toBeUndefined()
  })

  it('retains a selected metric without dimensions and ignores unknown series names', () => {
    expect(contextFromChartDatum({ ...query, dimensions: [] }, { __vis_series: 'Revenue' }))
      .toEqual({ metric: 'Revenue', filters: [], labels: [] })
    expect(contextFromChartDatum(query, { 日期: '2026-08-31', __vis_series: 'removed metric' })?.metric)
      .toBeUndefined()
    expect(contextFromChartDatum(query, { __vis_series: 'Revenue' })).toBeNull()
  })

  it('does not offer raw details for a clicked contrast series', () => {
    const contrastQuery: VisQueryConfig = {
      ...query,
      metrics: [{
        ...query.metrics![0]!,
        contrast: { timeField: 'order_date', calcMethod: 'shift_year', calcType: 'diffRate', valueExp: 'current_month' },
      }],
    }
    expect(contextFromChartDatum(contrastQuery, { 日期: '2026-08-31', __vis_series: 'Revenue' })).toBeNull()
  })
})
