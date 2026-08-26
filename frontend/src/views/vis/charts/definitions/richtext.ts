import type { ChartDefinition } from '../types'
import FeatureFormStub from '../style-forms/FeatureFormStub.vue'
import StaticStyleForm from '../style-forms/StaticStyleForm.vue'

export const richtextChart: ChartDefinition = {
  type: 'richtext',
  label: '文本',
  group: 'other',
  summary: '说明文字，可插入数字、进度和提示',
  order: 10,
  FeatureForm: FeatureFormStub,
  StyleForm: StaticStyleForm,
}
