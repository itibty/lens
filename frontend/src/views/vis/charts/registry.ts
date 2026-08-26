import type { ChartDefinition, ChartPickerGroup } from './types'
import type { ChartType } from '@/views/vis/shared/types'
import { barChart } from './definitions/bar'
import { comboChart } from './definitions/combo'
import { funnelChart } from './definitions/funnel'
import { heatmapChart } from './definitions/heatmap'
import { kpiChart } from './definitions/kpi'
import { lineChart } from './definitions/line'
import { numberChart } from './definitions/number'
import { pieChart } from './definitions/pie'
import { pivotChart } from './definitions/pivot'
import { progressChart } from './definitions/progress'
import { radarChart } from './definitions/radar'
import { rankChart } from './definitions/rank'
import { richtextChart } from './definitions/richtext'
import { scatterChart } from './definitions/scatter'
import { tableChart } from './definitions/table'
import { tornadoChart } from './definitions/tornado'
import { treemapChart } from './definitions/treemap'
import { trendChart } from './definitions/trend'
import { urlChart } from './definitions/url'
import { waterfallChart } from './definitions/waterfall'
import { wordcloudChart } from './definitions/wordcloud'

const GROUP_ORDER: Record<ChartPickerGroup, number> = {
  metric: 0,
  compare: 1,
  trend: 2,
  compose: 3,
  relate: 4,
  table: 5,
  other: 6,
}

const CHART_DEFINITIONS: ChartDefinition[] = [
  numberChart,
  trendChart,
  rankChart,
  progressChart,
  kpiChart,
  tableChart,
  pivotChart,
  barChart,
  lineChart,
  comboChart,
  waterfallChart,
  tornadoChart,
  pieChart,
  treemapChart,
  scatterChart,
  heatmapChart,
  radarChart,
  funnelChart,
  wordcloudChart,
  richtextChart,
  urlChart,
].slice().sort((a, b) => {
  const group = GROUP_ORDER[a.group] - GROUP_ORDER[b.group]
  return group !== 0 ? group : a.order - b.order
})

const BY_TYPE = new Map<ChartType, ChartDefinition>(
  CHART_DEFINITIONS.map(def => [def.type, def]),
)

const PUBLISHED_TYPES = new Set<ChartType>(
  CHART_DEFINITIONS.map(def => def.type),
)

export function listChartDefinitions(): ChartDefinition[] {
  return CHART_DEFINITIONS
}

export function listPublishedChartDefinitions(): ChartDefinition[] {
  return CHART_DEFINITIONS.filter(def => PUBLISHED_TYPES.has(def.type))
}

export function getChartDefinition(type?: string): ChartDefinition | undefined {
  if (!type)
    return undefined
  const key = String(type).toLowerCase() as ChartType
  return BY_TYPE.get(key)
}

/** 选择器 / 列表用选项（仅后端已支持的图类型） */
export const CHART_TYPE_OPTIONS: Array<{ label: string, value: ChartType }>
  = listPublishedChartDefinitions().map(def => ({
    label: def.label,
    value: def.type,
  }))
