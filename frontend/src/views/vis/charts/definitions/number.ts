import type { ChartDefinition } from '../types'
import NumberFeatureForm from '../style-forms/NumberFeatureForm.vue'
import NumberStyleForm from '../style-forms/NumberStyleForm.vue'

export const numberChart: ChartDefinition = {
  type: 'number',
  label: '指标卡',
  group: 'metric',
  summary: '当期一个汇总数，可看同比 / 环比',
  order: 10,
  FeatureForm: NumberFeatureForm,
  StyleForm: NumberStyleForm,
}
