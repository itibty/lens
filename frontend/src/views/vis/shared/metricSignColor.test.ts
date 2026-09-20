import type { VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import { fieldStyleKey } from './fieldStyle'
import { resolveKpiView } from './kpiCard'
import { resolveProgressView } from './progressCard'
import { resolveRankItems } from './rankCard'
import { resolveTrendView } from './trendCard'

const current: VIS.MetricItem = { field: 'current', agg: 'SUM' }
const target: VIS.MetricItem = { field: 'target', agg: 'SUM' }
const query: VIS.QueryConfig = {
  datasetId: '1',
  dimensions: [{ field: 'date' }],
  metrics: [current, target],
}
const data: VIS.QueryDataResponse = {
  columns: ['date', 'current', 'target'],
  rows: [{ date: '2026-09-17', current: 20, target: 100 }, { date: '2026-09-18', current: 10, target: 0 }],
  total: 2,
  truncated: false,
}
function visual(chartType: VisVisualConfig['chartType']): VisVisualConfig {
  return {
    chartType,
    cardColor: '#123456',
    fieldStyles: [
      { key: fieldStyleKey(current), kind: 'metric', format: { signColor: 'positive-red' } },
      { key: fieldStyleKey(target), kind: 'metric', format: { signColor: 'positive-green' } },
    ],
  }
}

describe('numeric field colors across card types', () => {
  it('colors trend values and previous-period changes by their own signs', () => {
    const view = resolveTrendView(query, data, visual('trend'))
    expect(view).toMatchObject({ color: 'var(--el-color-danger)', changeColor: 'var(--el-color-success)' })
    expect(view?.auxiliaries[0]?.color).toBeUndefined()
    const unconfigured = resolveTrendView(query, data, { chartType: 'trend' })
    expect(unconfigured?.color).toBeUndefined()
    expect(unconfigured?.changeColor).toBeUndefined()
  })

  it('colors current and target values independently in progress cards', () => {
    expect(resolveProgressView(query, data, visual('progress'))).toMatchObject({
      currentColor: 'var(--el-color-danger)',
      targetColor: 'var(--el-color-success)',
    })
  })

  it('does not apply a metric rule to a fixed target', () => {
    const view = resolveProgressView({ ...query, metrics: [current] }, data, {
      ...visual('progress'),
      progress: { target: 100 },
    })
    expect(view?.currentColor).toBe('var(--el-color-danger)')
    expect(view?.targetColor).toBeUndefined()
  })

  it('colors KPI current and target values without changing progress fills', () => {
    const view = resolveKpiView(query, data, visual('kpi'))
    expect(view?.rows[0]).toMatchObject({
      currentColor: 'var(--el-color-danger)',
      targetColor: 'var(--el-color-success)',
    })
  })

  it('colors ranking values by the configured metric rule', () => {
    expect(resolveRankItems(query, data, visual('rank')).map(item => item.valueColor))
      .toEqual(['var(--el-color-danger)', 'var(--el-color-danger)'])
  })
})
