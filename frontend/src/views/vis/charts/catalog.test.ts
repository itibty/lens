import { describe, expect, it } from 'vitest'
import { listChartConstraints } from '@/views/vis/cards/chartShape'
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
})
