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
  'tornado',
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
    needsDataset: stage !== 'static',
    allowFullscreen: options.allowFullscreen ?? true,
    allowContrast: options.allowContrast ?? false,
    usesChartTheme: stage === 'chart' || stage === 'table' || stage === 'pivot',
    cardinality,
    constraints,
  }
}

const AT_LEAST_ONE_EACH: ChartCardinality = {
  dimensions: { min: 1 },
  metrics: { min: 1 },
}

const EXACTLY_ONE_EACH: ChartCardinality = {
  dimensions: { min: 1, max: 1 },
  metrics: { min: 1, max: 1 },
}

export const CHART_CATALOG: Record<ChartType, ChartCatalogEntry> = {
  bar: entry('chart', AT_LEAST_ONE_EACH, [
    '至少 1 个维度、1 个指标',
    '多指标时只能 1 个维度',
  ]),
  line: entry('chart', AT_LEAST_ONE_EACH, [
    '至少 1 个维度、1 个指标',
    '多指标时只能 1 个维度',
  ]),
  combo: entry('chart', {
    dimensions: { min: 1, max: 1 },
    metrics: { min: 2 },
  }, [
    '恰好 1 个维度、至少 2 个指标',
    '未指定折线指标时，最后一个指标画折线',
  ]),
  pie: entry('chart', EXACTLY_ONE_EACH, ['恰好 1 个维度、1 个指标']),
  scatter: entry('chart', {
    dimensions: { min: 0, max: 1 },
    metrics: { min: 2, max: 2 },
  }, [
    '恰好 2 个指标，按顺序对应横轴、纵轴',
    '最多 1 个维度',
  ]),
  table: entry('table', {
    dimensions: { min: 0 },
    metrics: { min: 0 },
  }, [
    '维度、指标不能都为空',
    '有日期维度时，不可配置同比 / 环比',
  ], { allowContrast: true }),
  number: entry('number', {
    dimensions: { min: 0, max: 0 },
    metrics: { min: 1 },
  }, [
    '不投放维度，只出当期一个数',
    '至少 1 个主指标（未开同比 / 环比），可另加同比 / 环比或辅指标',
  ], { allowContrast: true, allowFullscreen: false }),
  progress: entry('progress', {
    dimensions: { min: 0, max: 0 },
    metrics: { min: 1, max: 2 },
  }, [
    '至少 1 个指标（当前值）',
    '目标：指标区第 2 个指标，或功能设置中的固定目标',
  ], { allowFullscreen: false }),
  kpi: entry('kpi', {
    dimensions: { min: 1, max: 1 },
    metrics: { min: 1, max: 2 },
  }, [
    '恰好 1 个维度',
    '至少 1 个指标（当前值）',
    '目标：指标区第 2 个指标，或功能设置中的固定目标',
  ]),
  radar: entry('chart', {
    dimensions: { min: 1, max: 1 },
    metrics: { min: 1 },
  }, [
    '恰好 1 个维度',
    '至少 1 个指标',
  ]),
  funnel: entry('chart', EXACTLY_ONE_EACH, ['恰好 1 个维度、1 个指标']),
  wordcloud: entry('chart', EXACTLY_ONE_EACH, ['恰好 1 个维度、1 个指标']),
  heatmap: entry('chart', {
    dimensions: { min: 2, max: 2 },
    metrics: { min: 1, max: 1 },
  }, [
    '恰好 2 个维度、1 个指标',
    '第 1 个维度为横轴，第 2 个为纵轴',
  ]),
  treemap: entry('chart', {
    dimensions: { min: 1, max: 3 },
    metrics: { min: 1, max: 1 },
  }, [
    '1 到 3 个维度、恰好 1 个指标',
    '维度按顺序嵌套，指标映射面积',
  ]),
  waterfall: entry('chart', EXACTLY_ONE_EACH, [
    '恰好 1 个维度、1 个指标',
    '正数为增加、负数为减少；默认可在末项追加合计',
  ]),
  trend: entry('trend', {
    dimensions: { min: 1, max: 1 },
    metrics: { min: 1 },
  }, [
    '恰好 1 个维度（建议按时间升序）、至少 1 个指标',
    '主值取最后一期；较上期是相邻两点，不能配同比 / 环比',
  ], { allowFullscreen: false }),
  tornado: entry('chart', {
    dimensions: { min: 1, max: 1 },
    metrics: { min: 2, max: 2 },
  }, [
    '恰好 1 个维度、2 个指标',
    '第 1 个指标朝左，第 2 个朝右',
  ]),
  rank: entry('rank', EXACTLY_ONE_EACH, [
    '恰好 1 个维度、1 个指标',
    '按指标从大到小排列',
  ]),
  richtext: entry('static', {
    dimensions: { min: 0, max: 0 },
    metrics: { min: 0, max: 0 },
  }, ['至少有一段正文或一个内容模块']),
  url: entry('static', {
    dimensions: { min: 0, max: 0 },
    metrics: { min: 0, max: 0 },
  }, ['须填写有效的 http(s) 网址']),
  pivot: entry('pivot', {
    dimensions: { min: 0 },
    metrics: { min: 1 },
  }, [
    '至少 1 个指标',
    '同一字段不能既做行维又做列维',
  ]),
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
