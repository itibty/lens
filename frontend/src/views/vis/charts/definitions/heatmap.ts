import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const heatmapChart: ChartDefinition = {
  type: 'heatmap',
  label: '热力图',
  group: 'relate',
  summary: '看两个维度交叉处的冷热分布',
  order: 20,
  ...CHART_FEATURE.heatmap,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
