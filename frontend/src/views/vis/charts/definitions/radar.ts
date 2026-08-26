import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const radarChart: ChartDefinition = {
  type: 'radar',
  label: '雷达图',
  group: 'compare',
  summary: '多指标对比整体画像',
  order: 50,
  ...CHART_FEATURE.radar,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
