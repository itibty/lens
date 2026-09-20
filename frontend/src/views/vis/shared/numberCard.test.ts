import type { VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import { fieldStyleKey } from './fieldStyle'
import { resolveNumberView } from './numberCard'

const query: VIS.QueryConfig = {
  datasetId: '1',
  metrics: [{ field: 'sales', agg: 'SUM' }],
}
const visual: VisVisualConfig = { chartType: 'number' }
const rate: VIS.MetricItem = {
  field: 'sales',
  label: '销售额同比',
  agg: 'SUM',
  contrast: {
    timeField: 'order_date',
    calcMethod: 'shift_year',
    calcType: 'diffRate',
    valueExp: 'current_month',
  },
}
const difference: VIS.MetricItem = {
  ...rate,
  label: '销售额环比差值',
  contrast: { ...rate.contrast!, calcMethod: 'shift_month', calcType: 'diff' },
}

function data(rows: Record<string, unknown>[]): VIS.QueryDataResponse {
  return { columns: ['sales'], rows, total: rows.length, truncated: false }
}

describe('number card empty result', () => {
  it('treats an aggregate row without a primary value as empty', () => {
    expect(resolveNumberView(query, data([{}]), visual)).toBeNull()
    expect(resolveNumberView(query, data([{ sales: null }]), visual)).toBeNull()
  })

  it('keeps zero as a valid metric value', () => {
    expect(resolveNumberView(query, data([{ sales: 0 }]), visual)?.body).toBe('0')
  })
})

describe('number card primary metric', () => {
  it('leaves unconfigured contrast values without color overrides', () => {
    const view = resolveNumberView(
      { ...query, metrics: [rate, difference] },
      data([{ [rate.label!]: 12, [difference.label!]: -100 }]),
      { ...visual, cardColor: '#123456' },
    )
    expect(view?.color).toBeUndefined()
    expect(view?.auxiliaries[0]?.color).toBeUndefined()
  })

  it('applies per-field colors to main and auxiliary values independently of content colors', () => {
    const sales = query.metrics![0]!
    const colored: VisVisualConfig = {
      ...visual,
      cardColor: '#123456',
      number: { color: '#abcdef' },
      fieldStyles: [
        { key: fieldStyleKey(rate), kind: 'metric', format: { signColor: 'positive-red' } },
        { key: fieldStyleKey(sales), kind: 'metric', format: { signColor: 'positive-green' } },
      ],
    }
    const result = data([{ [rate.label!]: 12, sales: -100, [difference.label!]: 200 }])
    const view = resolveNumberView({ ...query, metrics: [rate, sales, difference] }, result, colored)
    expect(view?.color).toBe('var(--el-color-danger)')
    expect(view?.auxiliaries.map(item => item.color)).toEqual(['var(--el-color-danger)', undefined])
    const reordered = resolveNumberView({ ...query, metrics: [sales, rate] }, result, colored)
    expect(reordered?.color).toBe('var(--el-color-danger)')
    expect(reordered?.auxiliaries[0]?.color).toBe('var(--el-color-danger)')
  })

  it('uses content colors for zero and empty auxiliary values even with a sign rule', () => {
    const view = resolveNumberView(
      { ...query, metrics: [rate, difference] },
      data([{ [rate.label!]: 0, [difference.label!]: null }]),
      {
        ...visual,
        fieldStyles: [rate, difference].map(metric => ({
          key: fieldStyleKey(metric),
          kind: 'metric',
          format: { signColor: 'positive-red' },
        })),
      },
    )
    expect(view).not.toBeNull()
    expect(view?.color).toBeUndefined()
    expect(view?.auxiliaries[0]).toMatchObject({ color: undefined, text: '-' })
  })

  it.each([
    [12.5, '+12.5'],
    [-12.5, '-12.5'],
    [0, '0'],
  ])('renders a contrast-only card with value %s', (value, body) => {
    const view = resolveNumberView({ ...query, metrics: [rate] }, data([{ [rate.label!]: value }]), visual)
    expect(view).toMatchObject({ label: rate.label, body, suffix: '', auxiliaries: [] })
  })

  it('uses the first metric even when a regular metric follows it', () => {
    const sales = query.metrics![0]!
    const result = data([{ sales: 1200, [rate.label!]: 20, [difference.label!]: -200 }])
    const view = resolveNumberView({ ...query, metrics: [rate, sales, difference] }, result, visual)
    expect(view).toMatchObject({ label: rate.label, body: '+20' })
    expect(view?.auxiliaries).toMatchObject([
      { label: 'sales', text: '1,200', kind: 'metric' },
      { label: difference.label, text: '-200', kind: 'contrast', direction: 'down' },
    ])

    const reordered = resolveNumberView({ ...query, metrics: [sales, difference, rate] }, result, visual)
    expect(reordered).toMatchObject({ label: 'sales', body: '1,200' })
    expect(reordered?.auxiliaries.map(item => item.label)).toEqual([difference.label, rate.label])
  })

  it('supports a difference as the main value and a rate as the auxiliary', () => {
    const view = resolveNumberView(
      { ...query, metrics: [difference, rate] },
      data([{ [difference.label!]: 10000, [rate.label!]: 12.5 }]),
      {
        ...visual,
        fieldStyles: [
          { key: fieldStyleKey(difference), kind: 'metric', format: { compact: true, suffix: '元' } },
          { key: fieldStyleKey(rate), kind: 'metric', format: { suffix: '%' } },
        ],
      },
    )
    expect(view).toMatchObject({ body: '+1', compactSuffix: '万', suffix: '元' })
    expect(view?.auxiliaries).toMatchObject([{ label: rate.label, text: '+12.5%', direction: 'up' }])
  })

  it('applies the primary contrast field format without rescaling its percentage', () => {
    const view = resolveNumberView(
      { ...query, metrics: [rate] },
      data([{ [rate.label!]: 12.5 }]),
      {
        ...visual,
        fieldStyles: [{ key: fieldStyleKey(rate), kind: 'metric', format: { decimals: 2, suffix: '%' } }],
      },
    )
    expect(view).toMatchObject({ body: '+12.50', suffix: '%' })
  })

  it.each([null, undefined, ''])('keeps a missing main contrast empty instead of promoting an auxiliary (%s)', (value) => {
    expect(resolveNumberView(
      { ...query, metrics: [rate, ...query.metrics!] },
      data([{ [rate.label!]: value, sales: 1200 }]),
      visual,
    )).toBeNull()
  })

  it('uses the primary contrast periods even if its metadata is not first', () => {
    const info: VIS.ContrastInfo = {
      label: rate.label!,
      timeField: 'order_date',
      calcMethod: 'shift_year',
      calcType: 'diffRate',
      current: { start: '2026-09-01', end: '2026-09-18' },
      compare: { start: '2025-09-01', end: '2025-09-18' },
    }
    const view = resolveNumberView(
      { ...query, metrics: [rate, difference] },
      {
        ...data([{ [rate.label!]: 12.5, [difference.label!]: 200 }]),
        contrasts: [
          { ...info, label: difference.label!, compare: { start: '2026-08-01', end: '2026-08-18' } },
          info,
        ],
      },
      visual,
    )
    expect(view?.periods).toEqual([
      { label: '评估期', range: '2026-09-01～2026-09-18' },
      { label: '对比期', range: '2025-09-01～2025-09-18' },
    ])
    expect(view?.auxiliaries[0]?.periods).toEqual([
      { label: '评估期', range: '2026-09-01～2026-09-18' },
      { label: '对比期', range: '2026-08-01～2026-08-18' },
    ])
  })

  it('does not invent periods from the base date or another metric', () => {
    const result: VIS.QueryDataResponse = {
      ...data([{ sales: 1200, cost: 300, [rate.label!]: 12.5, [difference.label!]: 200 }]),
      asOfDate: '2026-09-18',
      contrasts: [{
        label: rate.label!,
        timeField: 'order_date',
        calcMethod: 'shift_year',
        calcType: 'diffRate',
        current: { start: '2026-09-01', end: '2026-09-18' },
        compare: { start: '2025-09-01', end: '2025-09-18' },
      }],
    }
    const view = resolveNumberView({
      ...query,
      metrics: [query.metrics![0]!, { field: 'cost', agg: 'SUM' }, rate, difference],
    }, result, visual)
    expect(view?.periods).toEqual([])
    expect(view?.auxiliaries[0]?.periods).toEqual([])
    expect(view?.auxiliaries[1]?.periods).toHaveLength(2)
    expect(view?.auxiliaries[2]?.periods).toEqual([])
    const missing = resolveNumberView({ ...query, metrics: [difference] }, result, visual)
    expect(missing?.periods).toEqual([])
  })

  it('omits missing range rows and displays single-day periods once', () => {
    const view = resolveNumberView({ ...query, metrics: [rate] }, {
      ...data([{ [rate.label!]: 12.5 }]),
      contrasts: [{
        label: rate.label!,
        timeField: 'order_date',
        calcMethod: 'shift_year',
        calcType: 'diffRate',
        current: { start: '', end: '' },
        compare: { start: '2025-09-18', end: '2025-09-18' },
      }],
    }, visual)
    expect(view?.periods).toEqual([{ label: '对比期', range: '2025-09-18' }])
  })
})
