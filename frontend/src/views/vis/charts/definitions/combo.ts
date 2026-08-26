import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const comboChart: ChartDefinition = {
  type: 'combo',
  label: '组合图',
  group: 'trend',
  summary: '柱和线画在一起，适合对比不同量纲',
  order: 20,
  ...CHART_FEATURE.combo,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
