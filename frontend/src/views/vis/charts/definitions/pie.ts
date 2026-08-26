import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const pieChart: ChartDefinition = {
  type: 'pie',
  label: '饼图',
  group: 'compose',
  summary: '看各部分占整体的比重',
  order: 10,
  ...CHART_FEATURE.pie,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
