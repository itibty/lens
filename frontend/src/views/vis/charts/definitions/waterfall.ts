import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const waterfallChart: ChartDefinition = {
  type: 'waterfall',
  label: '瀑布图',
  group: 'compare',
  summary: '看从起点到终点，各项如何增减',
  order: 40,
  ...CHART_FEATURE.waterfall,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
