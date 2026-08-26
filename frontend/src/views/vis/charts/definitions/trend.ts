import type { ChartDefinition } from '../types'
import NumberStyleForm from '../style-forms/NumberStyleForm.vue'
import TrendFeatureForm from '../style-forms/TrendFeatureForm.vue'

export const trendChart: ChartDefinition = {
  type: 'trend',
  label: '趋势卡',
  group: 'metric',
  summary: '按一维看走势，数字取最新一期',
  order: 20,
  FeatureForm: TrendFeatureForm,
  StyleForm: NumberStyleForm,
}
