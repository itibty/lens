import type { ChartDefinition } from '../types'
import { CHART_FEATURE } from '@/views/vis/shared/chartOptions'
import ChartFeatureForm from '../style-forms/ChartFeatureForm.vue'
import ChartStyleForm from '../style-forms/ChartStyleForm.vue'

export const wordcloudChart: ChartDefinition = {
  type: 'wordcloud',
  label: '词云',
  group: 'compose',
  summary: '出现越多，文字越大',
  order: 40,
  ...CHART_FEATURE.wordcloud,
  FeatureForm: ChartFeatureForm,
  StyleForm: ChartStyleForm,
}
