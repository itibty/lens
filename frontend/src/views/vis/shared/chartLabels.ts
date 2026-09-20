import type { ChartType, VisChartLabelContent, VisQueryConfig, VisVisualConfig } from './types'

export const CHART_LABEL_COPY = {
  content: '内容',
  options: {
    name: '名称',
    value: '数值',
    nameValue: '名称和数值',
    percent: '占比',
    namePercent: '名称和占比',
  },
} as const

interface ChartLabelConfig {
  default: VisChartLabelContent
  options: readonly VisChartLabelContent[]
}

const NAME_VALUE_OPTIONS = ['name', 'value', 'nameValue'] as const
const CHART_LABEL_CONFIG: Partial<Record<ChartType, ChartLabelConfig>> = {
  pie: { default: 'namePercent', options: [...NAME_VALUE_OPTIONS, 'percent', 'namePercent'] },
  funnel: { default: 'nameValue', options: NAME_VALUE_OPTIONS },
  treemap: { default: 'name', options: NAME_VALUE_OPTIONS },
  scatter: { default: 'name', options: NAME_VALUE_OPTIONS },
}
const SCATTER_VALUE_ONLY: ChartLabelConfig = { default: 'value', options: ['value'] }

/** 表单、渲染与保存共用内容规则；散点无维度时没有名称可展示。 */
export function chartLabelConfig(chartType: string, query?: Pick<VisQueryConfig, 'dimensions'>) {
  if (chartType === 'scatter' && !query?.dimensions?.length)
    return SCATTER_VALUE_ONLY
  return CHART_LABEL_CONFIG[chartType as ChartType]
}

export function resolveChartLabelContent(
  visual: Pick<VisVisualConfig, 'chart'> | undefined,
  chartType: string,
  query?: Pick<VisQueryConfig, 'dimensions'>,
): VisChartLabelContent {
  const config = chartLabelConfig(chartType, query)
  const value = visual?.chart?.dataLabelContent
  return value && config?.options.includes(value) ? value : config?.default ?? 'value'
}

/** 组合内容按行展示，保留各图形已有的标签布局与避让。 */
export function chartLabelText(
  content: VisChartLabelContent,
  name: unknown,
  value: string | string[],
  percent = '-',
): string | string[] {
  const title = name == null || name === '' ? '-' : String(name)
  switch (content) {
    case 'name': return title
    case 'nameValue': return [title, ...(Array.isArray(value) ? value : [value])]
    case 'percent': return percent
    case 'namePercent': return [title, percent]
    default: return value
  }
}
