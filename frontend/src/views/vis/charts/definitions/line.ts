import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const lineChart: ChartDefinition = {
  type: 'line',
  label: '折线图',
  group: 'trend',
  summary: '看数值如何随时间变化',
  order: 10,
  ...CHART_FEATURE.line,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
