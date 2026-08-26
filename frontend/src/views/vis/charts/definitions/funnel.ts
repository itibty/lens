import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const funnelChart: ChartDefinition = {
  type: 'funnel',
  label: '漏斗图',
  group: 'compose',
  summary: '看各阶段转化和流失',
  order: 30,
  ...CHART_FEATURE.funnel,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
