import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const scatterChart: ChartDefinition = {
  type: 'scatter',
  label: '散点图',
  group: 'relate',
  summary: '看两个指标是否相关',
  order: 10,
  ...CHART_FEATURE.scatter,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
