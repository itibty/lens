import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const treemapChart: ChartDefinition = {
  type: 'treemap',
  label: '矩形树图',
  group: 'compose',
  summary: '用面积看构成，维度可嵌套',
  order: 20,
  ...CHART_FEATURE.treemap,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
