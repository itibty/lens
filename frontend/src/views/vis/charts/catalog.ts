import { CHART_HELP } from './chartHelp'

export const CHART_TYPES = [
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
  'rank',
  'richtext',
  'url',
  'pivot',
] as const

export type ChartType = (typeof CHART_TYPES)[number]

export type VisStageMode
  = | 'number'
    | 'progress'
    | 'kpi'
    | 'trend'
    | 'rank'
    | 'table'
    | 'pivot'
    | 'chart'
    | 'static'
    | 'unknown'

export interface ChartCardinalityRange {
  min: number
  max?: number
}

export interface ChartCardinality {
  dimensions: ChartCardinalityRange
  metrics: ChartCardinalityRange
}

export interface ChartCatalogEntry {
  stage: Exclude<VisStageMode, 'unknown'>
  needsDataset: boolean
  allowViewData: boolean
  allowFullscreen: boolean
  allowContrast: boolean
  usesChartTheme: boolean
  cardinality: ChartCardinality
  constraints: readonly string[]
}

function entry(
  stage: ChartCatalogEntry['stage'],
  cardinality: ChartCardinality,
  constraints: readonly string[],
  options: Partial<Pick<ChartCatalogEntry, 'allowContrast' | 'allowFullscreen'>> = {},
): ChartCatalogEntry {
  return {
    stage,
    allowViewData: stage !== 'static' && stage !== 'table' && stage !== 'pivot',
    needsDataset: stage !== 'static',
    allowFullscreen: options.allowFullscreen ?? true,
    allowContrast: options.allowContrast ?? false,
    usesChartTheme: stage === 'chart' || stage === 'table' || stage === 'pivot',
    cardinality,
    constraints,
  }
}

const CARTESIAN_CARDINALITY: ChartCardinality = {
  dimensions: { min: 1, max: 2 },
  metrics: { min: 1 },
}

const EXACTLY_ONE_EACH: ChartCardinality = {
  dimensions: { min: 1, max: 1 },
  metrics: { min: 1, max: 1 },
}

export const CHART_CATALOG: Record<ChartType, ChartCatalogEntry> = {
  bar: entry('chart', CARTESIAN_CARDINALITY, CHART_HELP.bar.constraints),
  line: entry('chart', CARTESIAN_CARDINALITY, CHART_HELP.line.constraints),
  combo: entry('chart', {
    dimensions: { min: 1, max: 1 },
    metrics: { min: 2 },
  }, CHART_HELP.combo.constraints),
  pie: entry('chart', EXACTLY_ONE_EACH, CHART_HELP.pie.constraints),
  scatter: entry('chart', {
    dimensions: { min: 0, max: 1 },
    metrics: { min: 2, max: 2 },
  }, CHART_HELP.scatter.constraints),
  table: entry('table', {
    dimensions: { min: 0 },
    metrics: { min: 0 },
  }, CHART_HELP.table.constraints, { allowContrast: true }),
  number: entry('number', {
    dimensions: { min: 0, max: 0 },
    metrics: { min: 1 },
  }, CHART_HELP.number.constraints, { allowContrast: true, allowFullscreen: false }),
  progress: entry('progress', {
    dimensions: { min: 0, max: 0 },
    metrics: { min: 1, max: 2 },
  }, CHART_HELP.progress.constraints, { allowFullscreen: false }),
  kpi: entry('kpi', {
    dimensions: { min: 1, max: 1 },
    metrics: { min: 1, max: 2 },
  }, CHART_HELP.kpi.constraints),
  radar: entry('chart', {
    dimensions: { min: 1, max: 1 },
    metrics: { min: 1 },
  }, CHART_HELP.radar.constraints),
  funnel: entry('chart', EXACTLY_ONE_EACH, CHART_HELP.funnel.constraints),
  wordcloud: entry('chart', EXACTLY_ONE_EACH, CHART_HELP.wordcloud.constraints),
  heatmap: entry('chart', {
    dimensions: { min: 2, max: 2 },
    metrics: { min: 1, max: 1 },
  }, CHART_HELP.heatmap.constraints),
  treemap: entry('chart', {
    dimensions: { min: 1, max: 3 },
    metrics: { min: 1, max: 1 },
  }, CHART_HELP.treemap.constraints),
  waterfall: entry('chart', EXACTLY_ONE_EACH, CHART_HELP.waterfall.constraints),
  trend: entry('trend', {
    dimensions: { min: 1, max: 1 },
    metrics: { min: 1 },
  }, CHART_HELP.trend.constraints, { allowFullscreen: false }),
  rank: entry('rank', EXACTLY_ONE_EACH, CHART_HELP.rank.constraints),
  richtext: entry('static', {
    dimensions: { min: 0, max: 0 },
    metrics: { min: 0, max: 0 },
  }, CHART_HELP.richtext.constraints),
  url: entry('static', {
    dimensions: { min: 0, max: 0 },
    metrics: { min: 0, max: 0 },
  }, CHART_HELP.url.constraints),
  pivot: entry('pivot', {
    dimensions: { min: 0 },
    metrics: { min: 1 },
  }, CHART_HELP.pivot.constraints),
}

export const API_CHART_TYPES = new Set<string>(CHART_TYPES)
export const STATIC_CHART_TYPES = new Set<string>(CHART_TYPES.filter(type => CHART_CATALOG[type].stage === 'static'))
export const NO_FULLSCREEN_CHART_TYPES = new Set<string>(CHART_TYPES.filter(type => !CHART_CATALOG[type].allowFullscreen))

export function resolveChartTypeCode(raw?: string): ChartType | undefined {
  const type = String(raw || '').trim().toLowerCase()
  return API_CHART_TYPES.has(type) ? type as ChartType : undefined
}

export function getChartCatalogEntry(chartType: ChartType): ChartCatalogEntry
export function getChartCatalogEntry(chartType?: string): ChartCatalogEntry | undefined
export function getChartCatalogEntry(chartType?: string) {
  const type = resolveChartTypeCode(chartType)
  return type ? CHART_CATALOG[type] : undefined
}

export function allowsFullscreen(chartType?: string) {
  return getChartCatalogEntry(chartType)?.allowFullscreen ?? true
}

export function isPivotChart(chartType?: string) {
  return resolveChartTypeCode(chartType) === 'pivot'
}

export function isStaticChart(chartType?: string) {
  return getChartCatalogEntry(chartType)?.stage === 'static'
}

export function needsDataset(chartType?: string) {
  return getChartCatalogEntry(chartType)?.needsDataset ?? true
}

export function isProgressChart(chartType?: string) {
  return resolveChartTypeCode(chartType) === 'progress'
}

export function isKpiChart(chartType?: string) {
  return resolveChartTypeCode(chartType) === 'kpi'
}

export function isHeatmapChart(chartType?: string) {
  return resolveChartTypeCode(chartType) === 'heatmap'
}

export function isNumberChart(chartType?: string) {
  return resolveChartTypeCode(chartType) === 'number'
}

export function isTrendChart(chartType?: string) {
  return resolveChartTypeCode(chartType) === 'trend'
}

export function isRankChart(chartType?: string) {
  return resolveChartTypeCode(chartType) === 'rank'
}

export function isNumberStyleChart(chartType?: string) {
  return isNumberChart(chartType) || isTrendChart(chartType)
}

export function isVChartType(chartType?: string) {
  return getChartCatalogEntry(chartType)?.stage === 'chart'
}

export function usesChartTheme(chartType?: string) {
  return getChartCatalogEntry(chartType)?.usesChartTheme ?? false
}

export function resolveVisStage(chartType?: string): VisStageMode {
  return getChartCatalogEntry(chartType)?.stage ?? 'unknown'
}

export function hidesQueryDimensions(chartType?: string) {
  const stage = resolveVisStage(chartType)
  return stage === 'number' || stage === 'progress'
}

/** 查看数据是类型能力，不属于作者配置。 */
export function allowsViewData(chartType?: string) {
  return getChartCatalogEntry(chartType)?.allowViewData ?? false
}
