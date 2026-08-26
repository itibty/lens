import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const tornadoChart: ChartDefinition = {
  type: 'tornado',
  label: '对比条',
  group: 'compare',
  summary: '两个指标从中间向两边对照',
  order: 30,
  ...CHART_FEATURE.tornado,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
