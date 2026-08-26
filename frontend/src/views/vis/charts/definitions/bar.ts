import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const barChart: ChartDefinition = {
  type: 'bar',
  label: '柱状图',
  group: 'compare',
  summary: '比较不同类别的大小',
  order: 10,
  ...CHART_FEATURE.bar,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
