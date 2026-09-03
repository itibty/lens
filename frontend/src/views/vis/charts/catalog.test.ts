import type { ChartType } from './catalog'
import type { VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { describe, expect, it } from 'vitest'
import { collectQueryIssues, listChartConstraints } from '@/views/vis/cards/chartShape'
import {
  allowsFullscreen as sharedAllowsFullscreen,
  needsDataset as sharedNeedsDataset,
  resolveVisStage as sharedResolveVisStage,
} from '@/views/vis/shared/types'
import {
  CHART_CATALOG,
  CHART_TYPES,
  getChartCatalogEntry,
} from './catalog'
import { listPublishedChartDefinitions } from './registry'

const EXPECTED_CHART_TYPES = [
  'bar',
  'line',
  'combo',
  'pie',
  'scatter',
  'table',
  'number',
  'progress',
  'kpi',
  'radar',
  'funnel',
  'wordcloud',
  'heatmap',
  'treemap',
  'waterfall',
  'trend',
  'tornado',
  'rank',
  'richtext',
  'url',
  'pivot',
] as const

function dimensions(count: number, prefix = 'dimension'): VIS.DimensionItem[] {
  return Array.from({ length: count }, (_, index) => ({ field: `${prefix}_${index + 1}` }))
}

function metrics(count: number): VIS.MetricItem[] {
  return Array.from({ length: count }, (_, index) => ({ field: `metric_${index + 1}`, agg: 'SUM' }))
}

function query(dimensionCount: number, metricCount: number): VisQueryConfig {
  return {
    datasetId: 'dataset-1',
    dimensions: dimensions(dimensionCount),
    metrics: metrics(metricCount),
  }
}

function visual(chartType: ChartType, patch: Partial<VisVisualConfig> = {}): VisVisualConfig {
  return { chartType, ...patch }
}

function contrastMetric(): VIS.MetricItem {
  return {
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
}

describe('chart catalog', () => {
  it('publishes every supported chart type exactly once', () => {
    expect(CHART_TYPES).toEqual(EXPECTED_CHART_TYPES)
    expect(new Set(CHART_TYPES).size).toBe(EXPECTED_CHART_TYPES.length)
    expect(Object.keys(CHART_CATALOG).sort()).toEqual([...EXPECTED_CHART_TYPES].sort())
  })

  it('stays in sync with the UI registry', () => {
    expect(listPublishedChartDefinitions().map(item => item.type).sort())
      .toEqual([...EXPECTED_CHART_TYPES].sort())
  })

  it('describes the distinct query shapes', () => {
    expect(getChartCatalogEntry('richtext')).toMatchObject({
      stage: 'static',
      needsDataset: false,
      cardinality: { dimensions: { min: 0, max: 0 }, metrics: { min: 0, max: 0 } },
    })
    expect(getChartCatalogEntry('table')?.cardinality).toEqual({
      dimensions: { min: 0 },
      metrics: { min: 0 },
    })
    expect(getChartCatalogEntry('progress')?.cardinality).toEqual({
      dimensions: { min: 0, max: 0 },
      metrics: { min: 1, max: 2 },
    })
    expect(getChartCatalogEntry('combo')?.cardinality).toEqual({
      dimensions: { min: 1, max: 1 },
      metrics: { min: 2 },
    })
    expect(getChartCatalogEntry('scatter')?.cardinality).toEqual({
      dimensions: { min: 0, max: 1 },
      metrics: { min: 2, max: 2 },
    })
  })

  it('keeps compatibility helpers delegated to catalog metadata', () => {
    for (const type of CHART_TYPES) {
      const entry = getChartCatalogEntry(type)
      expect(sharedResolveVisStage(type), type).toBe(entry.stage)
      expect(sharedNeedsDataset(type), type).toBe(entry.needsDataset)
      expect(sharedAllowsFullscreen(type), type).toBe(entry.allowFullscreen)
      expect(listChartConstraints(type), type).toEqual(entry.constraints)
    }
  })

  it('allows contrast only for table and number cards', () => {
    expect(getChartCatalogEntry('table').allowContrast).toBe(true)
    expect(getChartCatalogEntry('number').allowContrast).toBe(true)
    expect(CHART_TYPES.filter(type => getChartCatalogEntry(type).allowContrast))
      .toEqual(['table', 'number'])
  })

  it.each([
    ['bar', query(1, 1), undefined],
    ['line', query(1, 2), undefined],
    ['combo', query(1, 2), undefined],
    ['pie', query(1, 1), undefined],
    ['scatter', query(0, 2), undefined],
    ['table', query(1, 0), undefined],
    ['number', query(0, 1), undefined],
    ['progress', query(0, 2), undefined],
    ['kpi', query(1, 2), undefined],
    ['radar', query(1, 1), undefined],
    ['funnel', query(1, 1), undefined],
    ['wordcloud', query(1, 1), undefined],
    ['heatmap', query(2, 1), undefined],
    ['treemap', query(3, 1), undefined],
    ['waterfall', query(1, 1), undefined],
    ['trend', query(1, 1), undefined],
    ['tornado', query(1, 2), undefined],
    ['rank', query(1, 1), undefined],
    ['richtext', query(0, 0), visual('richtext', { richtext: { html: '<p>正文</p>' } })],
    ['url', query(0, 0), visual('url', { web: { url: 'https://example.com' } })],
    ['pivot', {
      ...query(0, 1),
      rowDimensions: dimensions(1, 'row'),
      colDimensions: dimensions(1, 'column'),
    }, undefined],
  ] satisfies Array<[ChartType, VisQueryConfig, VisVisualConfig?]>)('accepts a valid %s query shape', (type, validQuery, chartVisual) => {
    expect(collectQueryIssues(type, validQuery, undefined, chartVisual), type).toEqual([])
  })

  it.each([
    ['bar', query(0, 1), undefined],
    ['line', query(1, 0), undefined],
    ['combo', query(1, 1), undefined],
    ['pie', query(2, 1), undefined],
    ['scatter', query(0, 1), undefined],
    ['table', query(0, 0), undefined],
    ['number', query(1, 1), undefined],
    ['progress', query(0, 1), undefined],
    ['kpi', query(1, 1), undefined],
    ['radar', query(0, 1), undefined],
    ['funnel', query(1, 2), undefined],
    ['wordcloud', query(0, 1), undefined],
    ['heatmap', query(1, 1), undefined],
    ['treemap', query(4, 1), undefined],
    ['waterfall', query(1, 2), undefined],
    ['trend', query(2, 1), undefined],
    ['tornado', query(1, 1), undefined],
    ['rank', query(1, 2), undefined],
    ['richtext', query(0, 0), visual('richtext')],
    ['url', query(0, 0), visual('url', { web: { url: 'javascript:alert(1)' } })],
    ['pivot', query(0, 0), undefined],
  ] satisfies Array<[ChartType, VisQueryConfig, VisVisualConfig?]>)('rejects an invalid %s query shape', (type, invalidQuery, chartVisual) => {
    expect(collectQueryIssues(type, invalidQuery, undefined, chartVisual).length, type).toBeGreaterThan(0)
  })

  it('enforces conditional query-shape rules', () => {
    expect(collectQueryIssues('progress', query(0, 1), undefined, visual('progress', {
      progress: { target: 100 },
    }))).toEqual([])
    expect(collectQueryIssues('kpi', query(1, 1), undefined, visual('kpi', {
      kpi: { target: 100 },
    }))).toEqual([])

    for (const type of ['bar', 'line'] as const) {
      expect(collectQueryIssues(type, query(2, 2)).some(issue => issue.shelf === 'dimensions'), type)
        .toBe(true)
    }

    const pivotWithDuplicateDimension: VisQueryConfig = {
      ...query(0, 1),
      rowDimensions: [{ field: 'region' }],
      colDimensions: [{ field: 'region' }],
    }
    expect(collectQueryIssues('pivot', pivotWithDuplicateDimension))
      .toContainEqual(expect.objectContaining({ shelf: 'colDimensions' }))

    const tableWithContrast: VisQueryConfig = {
      ...query(1, 0),
      metrics: [contrastMetric()],
    }
    expect(collectQueryIssues('table', tableWithContrast)).toEqual([])
    tableWithContrast.dimensions = [{ field: 'order_date' }]
    expect(collectQueryIssues('table', tableWithContrast, [{ field: 'order_date', dataType: 'date' }]))
      .toContainEqual(expect.objectContaining({ message: '当前有日期维度，指标中不可配置同环比' }))

    expect(collectQueryIssues('bar', {
      ...query(1, 0),
      metrics: [contrastMetric()],
    })).toContainEqual(expect.objectContaining({ message: '柱状图不支持同比 / 环比' }))

    expect(collectQueryIssues('number', {
      ...query(0, 0),
      metrics: [contrastMetric()],
    })).toContainEqual(expect.objectContaining({ message: '指标卡至少需要 1 个主指标（未开同比 / 环比）' }))
    expect(collectQueryIssues('number', {
      ...query(0, 1),
      metrics: [...metrics(1), contrastMetric()],
    })).toEqual([])
  })
})
