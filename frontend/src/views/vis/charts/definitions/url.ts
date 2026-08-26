import type { ChartDefinition } from '../types'
import FeatureFormStub from '../style-forms/FeatureFormStub.vue'
import StaticStyleForm from '../style-forms/StaticStyleForm.vue'

export const urlChart: ChartDefinition = {
  type: 'url',
  label: '外链网页',
  group: 'other',
  summary: '在卡片中嵌入网页',
  order: 20,
  FeatureForm: FeatureFormStub,
  StyleForm: StaticStyleForm,
}
