import type {
  ChartType,
  VisChartLegendPosition,
  VisChartOptions,
  VisChartOrientation,
  VisQueryConfig,
  VisVisualConfig,
} from './types'
import { sanitizeMarkLines } from './markLine'
import { isVChartType, metricAlias, regularMetrics } from './types'

export interface ChartCaps {
  legend: boolean
  tooltip: boolean
  dataLabel: boolean
  stacked: boolean
  orientation: boolean
  area: boolean
  smooth: boolean
  donut: boolean
  showRate: boolean
  dualAxis: boolean
  scrollbar: boolean
  crosshair: boolean
  lineMark: boolean
  markLine: boolean
  randomRotate: boolean
  shapeText: boolean
}

export interface ResolvedChartOptions {
  legend: boolean
  legendPosition: VisChartLegendPosition
  tooltip: boolean
  dataLabel: boolean
  stacked: boolean
  percent: boolean
  orientation: VisChartOrientation
  area: boolean
  smooth: boolean
  donut: boolean
  centerText: boolean
  showRate: boolean
  dualAxis: boolean
  scrollbar: boolean
  crosshair: boolean
  randomRotate: boolean
  shapeText: string
}

/** 图例默认：固定开关，或随「是否有系列」 */
export type ChartLegendDefault = boolean | 'series'

export interface ChartDefaultConfig {
  legend?: ChartLegendDefault
  legendPosition?: VisChartLegendPosition
  tooltip?: boolean
  dataLabel?: boolean
  stacked?: boolean
  percent?: boolean
  orientation?: VisChartOrientation
  area?: boolean
  smooth?: boolean
  donut?: boolean
  centerText?: boolean
  showRate?: boolean
  dualAxis?: boolean
  scrollbar?: boolean
  crosshair?: boolean
  randomRotate?: boolean
  shapeText?: string
}

export interface ChartFeatureConfig {
  caps?: Partial<ChartCaps>
  defaults?: Partial<ChartDefaultConfig>
}

const LEGEND_POS = new Set<VisChartLegendPosition>(['top', 'bottom', 'left', 'right'])
const ORIENT = new Set<VisChartOrientation>(['vertical', 'horizontal'])

const CAP_FIELDS: Record<keyof ChartCaps, Array<keyof VisChartOptions>> = {
  legend: ['legend', 'legendPosition'],
  tooltip: ['tooltip'],
  dataLabel: ['dataLabel'],
  stacked: ['stacked', 'percent'],
  orientation: ['orientation'],
  area: ['area'],
  smooth: ['smooth'],
  donut: ['donut', 'centerText'],
  showRate: ['showRate'],
  dualAxis: ['dualAxis', 'secondaryFields'],
  scrollbar: ['scrollbar'],
  crosshair: ['crosshair'],
  lineMark: ['lineFields'],
  markLine: ['markLines'],
  randomRotate: ['randomRotate'],
  shapeText: ['shapeText'],
}

/** 几何图公共能力；各图用 CHART_FEATURE.caps 覆盖 */
export const COMMON_CHART_CAPS: ChartCaps = {
  legend: true,
  tooltip: true,
  dataLabel: true,
  stacked: false,
  orientation: false,
  area: false,
  smooth: false,
  donut: false,
  showRate: false,
  dualAxis: false,
  scrollbar: false,
  crosshair: false,
  lineMark: false,
  markLine: false,
  randomRotate: false,
  shapeText: false,
}

/** 几何图公共默认；legend: 'series' = 有系列才开 */
export const COMMON_CHART_DEFAULTS: Required<ChartDefaultConfig> = {
  legend: 'series',
  legendPosition: 'bottom',
  tooltip: true,
  dataLabel: false,
  stacked: false,
  percent: false,
  orientation: 'vertical',
  area: false,
  smooth: false,
  donut: false,
  centerText: true,
  showRate: false,
  dualAxis: false,
  scrollbar: false,
  crosshair: false,
  randomRotate: false,
  shapeText: '',
}

/** 功能表单问号说明；一看就懂的项不写 */
export const CHART_FEATURE_TIPS = {
  areaRadar: '填充多边形，关闭后只留轮廓',
  percent: '每类合计为 100%，看构成占比',
  dataLabelBar: '堆叠时显示在各自柱段内，过窄的段会隐藏',
  showRate: '显示相邻阶段转化',
  secondaryFields: '勾选的用副轴，可全选或全不选',
  lineFields: '勾选的画折线，其余画柱；可全选或全不选',
  crosshair: '悬停时对齐到坐标轴，不是标记线',
  markLineField: '双轴时用来对齐对应轴',
  waterfallTotal: '在最后追加合计柱，由各项增减累加',
} as const

/**
 * 各图相对公共项的覆盖。
 * 系列判定、VChart 字段翻译等特例不放这里。
 */
export const CHART_FEATURE: Partial<Record<ChartType, ChartFeatureConfig>> = {
  bar: {
    caps: { stacked: true, orientation: true, dualAxis: true, scrollbar: true, crosshair: true, markLine: true },
  },
  line: {
    caps: { stacked: true, area: true, smooth: true, dualAxis: true, scrollbar: true, crosshair: true, markLine: true },
  },
  combo: {
    caps: { stacked: true, area: true, smooth: true, dualAxis: true, lineMark: true, scrollbar: true, crosshair: true, markLine: true },
    defaults: { dualAxis: true },
  },
  scatter: {
    caps: { crosshair: true, markLine: true },
  },
  pie: {
    caps: { donut: true },
    defaults: { legend: true, dataLabel: true },
  },
  radar: {
    caps: { area: true },
    defaults: { area: true },
  },
  funnel: {
    caps: { showRate: true },
    defaults: { legend: false, dataLabel: true },
  },
  wordcloud: {
    caps: { legend: false, dataLabel: false, randomRotate: true, shapeText: true },
    defaults: { legend: false },
  },
  heatmap: {
    defaults: { legend: true, legendPosition: 'right' },
  },
  treemap: {
    defaults: { legend: false, dataLabel: true },
  },
  waterfall: {
    caps: { orientation: true, scrollbar: true, crosshair: true, markLine: true },
    defaults: { legend: true, dataLabel: true },
  },
  tornado: {
    caps: { scrollbar: true },
    defaults: { legend: true, dataLabel: false },
  },
}

export function chartFeatureOf(chartType?: string): ChartFeatureConfig {
  const type = String(chartType || '').toLowerCase() as ChartType
  return CHART_FEATURE[type] ?? {}
}

export function mergeChartCaps(override?: Partial<ChartCaps>): ChartCaps {
  return { ...COMMON_CHART_CAPS, ...override }
}

export function chartCaps(chartType?: string): ChartCaps {
  return mergeChartCaps(chartFeatureOf(chartType).caps)
}

export function resolveChartDefaults(
  override?: Partial<ChartDefaultConfig>,
  hasSeries = false,
): ResolvedChartOptions {
  const merged = { ...COMMON_CHART_DEFAULTS, ...override }
  return {
    legend: merged.legend === 'series' ? hasSeries : merged.legend,
    legendPosition: merged.legendPosition,
    tooltip: merged.tooltip,
    dataLabel: merged.dataLabel,
    stacked: merged.stacked,
    percent: merged.percent,
    orientation: merged.orientation,
    area: merged.area,
    smooth: merged.smooth,
    donut: merged.donut,
    centerText: merged.donut ? (merged.centerText ?? true) : false,
    showRate: merged.showRate,
    dualAxis: merged.dualAxis,
    scrollbar: merged.scrollbar,
    crosshair: merged.crosshair,
    randomRotate: merged.randomRotate,
    shapeText: merged.shapeText,
  }
}

export function defaultChartOptions(chartType?: string, hasSeries = false): ResolvedChartOptions {
  return resolveChartDefaults(chartFeatureOf(chartType).defaults, hasSeries)
}

const ALWAYS_SERIES_CHARTS = new Set(['pie', 'wordcloud', 'treemap', 'waterfall', 'tornado'])
const CARTESIAN_SERIES_CHARTS = new Set(['bar', 'line', 'combo', 'radar'])

/** 多指标或第 2 维 → 有系列（饼 / 词云 / 树图按类别着色；散点有维才分色） */
export function chartHasSeries(
  chartType?: string,
  query?: Pick<VisQueryConfig, 'dimensions' | 'metrics'>,
) {
  const type = String(chartType || '').toLowerCase()
  const dims = query?.dimensions ?? []
  const metrics = regularMetrics(query?.metrics)
  if (ALWAYS_SERIES_CHARTS.has(type))
    return true
  if (type === 'scatter')
    return dims.length >= 1
  if (CARTESIAN_SERIES_CHARTS.has(type))
    return metrics.length > 1 || dims.length > 1
  return false
}

export function resolveChartOptions(
  visual: Pick<VisVisualConfig, 'chart'> | undefined,
  chartType?: string,
  hasSeries = false,
): ResolvedChartOptions {
  const fallback = defaultChartOptions(chartType, hasSeries)
  const raw = visual?.chart
  const legendPosition = raw?.legendPosition
  const orientation = raw?.orientation
  return {
    legend: raw?.legend ?? fallback.legend,
    legendPosition: legendPosition && LEGEND_POS.has(legendPosition)
      ? legendPosition
      : fallback.legendPosition,
    tooltip: raw?.tooltip ?? fallback.tooltip,
    dataLabel: raw?.dataLabel ?? fallback.dataLabel,
    stacked: raw?.stacked ?? fallback.stacked,
    percent: (raw?.stacked ?? fallback.stacked)
      ? (raw?.percent ?? fallback.percent)
      : false,
    orientation: orientation && ORIENT.has(orientation)
      ? orientation
      : fallback.orientation,
    area: raw?.area ?? fallback.area,
    smooth: raw?.smooth ?? fallback.smooth,
    donut: raw?.donut ?? fallback.donut,
    centerText: (raw?.donut ?? fallback.donut)
      ? (raw?.centerText ?? true)
      : false,
    showRate: raw?.showRate ?? fallback.showRate,
    dualAxis: raw?.dualAxis ?? fallback.dualAxis,
    scrollbar: raw?.scrollbar ?? fallback.scrollbar,
    crosshair: raw?.crosshair ?? fallback.crosshair,
    randomRotate: raw?.randomRotate ?? fallback.randomRotate,
    shapeText: (raw?.shapeText ?? fallback.shapeText).trim(),
  }
}

export function chartMetricAliases(query?: Pick<VisQueryConfig, 'metrics'>) {
  return regularMetrics(query?.metrics).map(metricAlias).filter(Boolean)
}

function defaultLastField(yFields: string[]) {
  return yFields.length >= 2 ? [yFields[yFields.length - 1]] : []
}

function defaultSecondaryFields(
  yFields: string[],
  visual?: Pick<VisVisualConfig, 'chart'>,
  chartType?: string,
) {
  if (String(chartType || '').toLowerCase() === 'combo')
    return resolveLineFields(visual, yFields)
  return defaultLastField(yFields)
}

/** 组合图画折线的指标；未配置 = 最后一个；允许全选或全不选 */
export function resolveLineFields(
  visual: Pick<VisVisualConfig, 'chart'> | undefined,
  yFields: string[],
) {
  if (yFields.length < 2)
    return []
  const raw = visual?.chart?.lineFields
  if (raw == null)
    return defaultLastField(yFields)
  return yFields.filter(field => raw.includes(field))
}

function sameFields(left: string[], right: string[]) {
  return left.length === right.length && left.every((field, index) => field === right[index])
}

export function normalizeSecondaryFields(selected: string[], yFields: string[]) {
  return yFields.filter(field => selected.includes(field))
}

/** 上副轴的指标；未配置 = 最后一个；组合未配置 = 折线指标；允许全选或全不选 */
export function resolveSecondaryFields(
  visual: Pick<VisVisualConfig, 'chart'> | undefined,
  yFields: string[],
  chartType?: string,
) {
  if (yFields.length < 2)
    return []
  const raw = visual?.chart?.secondaryFields
  if (raw == null)
    return defaultSecondaryFields(yFields, visual, chartType)
  return yFields.filter(field => raw.includes(field))
}

export function isHorizontalBar(chartType?: string, orientation?: VisChartOrientation) {
  const type = String(chartType || '').toLowerCase()
  return (type === 'bar' || type === 'waterfall') && orientation === 'horizontal'
}

export function isDualAxisEnabled(
  visual: Pick<VisVisualConfig, 'chart'> | undefined,
  chartType: string | undefined,
  yFields: string[],
) {
  return chartCaps(chartType).dualAxis
    && yFields.length >= 2
    && resolveChartOptions(visual, chartType, true).dualAxis
}

/** 落库时丢掉当前类型用不到的字段 / 空对象 */
export function pruneChartVisual(
  visual: VisVisualConfig,
  query?: Pick<VisQueryConfig, 'metrics'>,
) {
  if (!isVChartType(visual.chartType) || !visual.chart) {
    delete visual.chart
    return visual
  }
  const caps = chartCaps(visual.chartType)
  const next: VisChartOptions = { ...visual.chart }
  for (const [cap, fields] of Object.entries(CAP_FIELDS) as Array<[keyof ChartCaps, Array<keyof VisChartOptions>]>) {
    if (caps[cap])
      continue
    for (const field of fields)
      delete next[field]
  }
  const yFields = chartMetricAliases(query)
  if (isDualAxisEnabled({ chart: next }, visual.chartType, yFields)) {
    const secondary = resolveSecondaryFields({ chart: next }, yFields, visual.chartType)
    if (sameFields(secondary, defaultSecondaryFields(yFields, { chart: next }, visual.chartType)))
      delete next.secondaryFields
    else
      next.secondaryFields = secondary
  }
  else {
    delete next.secondaryFields
    if (yFields.length < 2)
      delete next.dualAxis
  }
  if (!next.stacked || visual.chartType !== 'bar')
    delete next.percent
  if (!next.donut || next.centerText !== false)
    delete next.centerText
  if (!next.randomRotate)
    delete next.randomRotate
  const shapeText = next.shapeText?.trim()
  if (shapeText)
    next.shapeText = shapeText
  else
    delete next.shapeText

  if (caps.lineMark) {
    const lines = resolveLineFields({ chart: next }, yFields)
    if (sameFields(lines, defaultLastField(yFields)))
      delete next.lineFields
    else
      next.lineFields = lines
  }
  if (visual.chartType === 'waterfall') {
    if (next.waterfallTotal !== false)
      delete next.waterfallTotal
  }
  else {
    delete next.waterfallTotal
  }
  if (caps.markLine) {
    const markLines = sanitizeMarkLines(next.markLines, yFields)
    if (markLines.length)
      next.markLines = markLines
    else
      delete next.markLines
  }
  if (!Object.keys(next).length)
    delete visual.chart
  else
    visual.chart = next
  return visual
}
