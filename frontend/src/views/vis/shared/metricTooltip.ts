import { formatContrastRange } from './contrastExp'
import { metricAlias } from './types'

export interface MetricTooltipPeriod {
  label: string
  range: string
}

/** 只展示当前指标实际返回的对比区间，不借用其他指标或基准日。 */
export function metricTooltipPeriods(metric: VIS.MetricItem | undefined, data: VIS.QueryDataResponse): MetricTooltipPeriod[] {
  if (!metric?.contrast)
    return []
  const info = data.contrasts?.find(item => item.label === metricAlias(metric))
  return [
    { label: '评估期', range: formatContrastRange(info?.current) },
    { label: '对比期', range: formatContrastRange(info?.compare) },
  ].filter(item => item.range)
}
