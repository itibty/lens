import type { VisQueryConfig, VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import { buildFieldStyleCandidates, fieldStyleKey, syncFieldStyles } from './fieldStyle'
import { listTableColumns } from './listTable'
import {
  METRIC_PROGRESS_DEFAULT_COLOR,
  METRIC_PROGRESS_MAX,
  METRIC_PROGRESS_MIN,
  metricProgressVTableConfig,
} from './metricCell'
import { buildPivotTableOption } from './pivotTable'

const metric: VIS.MetricItem & { _uid?: string } = {
  _uid: 'metric-1',
  field: 'completion_rate',
  label: '完成率',
  agg: 'AVG',
}

function query(): VisQueryConfig {
  return {
    datasetId: 'dataset-1',
    dimensions: [],
    metrics: [metric],
  }
}

function progressVisual(patch: Partial<NonNullable<VisVisualConfig['fieldStyles']>[number]['cellVisual']> = {}): VisVisualConfig {
  return {
    chartType: 'table',
    fieldStyles: [{
      sourceUid: metric._uid,
      key: fieldStyleKey(metric),
      kind: 'metric',
      format: { suffix: '%' },
      cellVisual: {
        type: 'progress',
        ...patch,
      },
    }],
  }
}

describe('metric cell progress', () => {
  it('uses a fixed zero-to-one-hundred domain and full-cell paint', () => {
    const config = metricProgressVTableConfig(progressVisual({
      color: '#123456',
    }), query(), '完成率')

    expect(config?.define).toEqual({
      cellType: 'progressbar',
      min: METRIC_PROGRESS_MIN,
      max: METRIC_PROGRESS_MAX,
      barType: 'default',
    })
    expect(config?.style).toMatchObject({
      barHeight: '100%',
      barBottom: 0,
      barPadding: [0],
      barColor: '#123456',
      barBgColor: 'rgba(0, 0, 0, 0.025)',
    })
  })

  it('does not decorate metrics whose display remains numeric', () => {
    expect(metricProgressVTableConfig({ chartType: 'table' }, query(), '完成率')).toBeNull()
  })

  it('keeps the default fill independent from the table theme', () => {
    const light = metricProgressVTableConfig(progressVisual(), query(), '完成率')
    const dark = metricProgressVTableConfig(progressVisual(), query(), '完成率', true)

    expect(light?.style.barColor).toBe(METRIC_PROGRESS_DEFAULT_COLOR)
    expect(dark?.style.barColor).toBe(METRIC_PROGRESS_DEFAULT_COLOR)
    expect(light?.style.barBgColor).not.toBe(dark?.style.barBgColor)
  })

  it('binds the progress renderer and keeps formatted text in list tables', () => {
    const columns = listTableColumns(query(), {
      columns: ['完成率'],
      rows: [{ 完成率: 42.5 }],
      total: 1,
      truncated: false,
    }, true, progressVisual())
    const column = columns[0] as unknown as {
      cellType?: string
      min?: number
      max?: number
      style?: Record<string, unknown>
      fieldFormat?: (record: Record<string, unknown>) => unknown
    }

    expect(column.cellType).toBe('progressbar')
    expect([column.min, column.max]).toEqual([0, 100])
    expect(column.style).toMatchObject({ barHeight: '100%', textAlign: 'right' })
    expect(column.fieldFormat?.({ 完成率: 42.5 })).toBe('42.5%')
  })

  it('binds the same renderer to pivot indicators', () => {
    const option = buildPivotTableOption({
      rowFields: [],
      columnFields: [],
      metrics: ['完成率'],
      columns: [],
      rows: [],
      total: 0,
      truncated: false,
      columnTruncated: false,
    }, { ...progressVisual(), chartType: 'pivot' }, query())
    const indicator = option?.indicators?.[0] as unknown as {
      cellType?: string
      min?: number
      max?: number
      style?: Record<string, unknown>
      format?: (value: unknown) => unknown
    }

    expect(indicator.cellType).toBe('progressbar')
    expect([indicator.min, indicator.max]).toEqual([0, 100])
    expect(indicator.style).toMatchObject({ barHeight: '100%', textAlign: 'right' })
    expect(indicator.format?.(88)).toBe('88%')
  })

  it('keeps and normalizes cell visuals while metric identities are synchronized', () => {
    const candidates = buildFieldStyleCandidates([metric])
    const rules = syncFieldStyles([{
      sourceUid: metric._uid,
      key: 'stale-key',
      kind: 'metric',
      cellVisual: {
        type: 'progress',
        color: '  #123456  ',
      },
    }], candidates)

    expect(rules).toEqual([{
      sourceUid: metric._uid,
      key: fieldStyleKey(metric),
      kind: 'metric',
      format: undefined,
      cellVisual: { type: 'progress', color: '#123456' },
    }])
  })
})
