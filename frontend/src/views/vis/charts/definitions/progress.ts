import type { ChartDefinition } from '../types'
import ProgressFeatureForm from '../style-forms/ProgressFeatureForm.vue'
import ProgressStyleForm from '../style-forms/ProgressStyleForm.vue'

export const progressChart: ChartDefinition = {
  type: 'progress',
  label: '进度图',
  group: 'metric',
  summary: '看当前完成了目标的多少',
  order: 30,
  FeatureForm: ProgressFeatureForm,
  StyleForm: ProgressStyleForm,
}
