import type { ChartDefinition } from '../types'
import CardChromeStyleForm from '../style-forms/CardChromeStyleForm.vue'
import PivotFeatureForm from '../style-forms/PivotFeatureForm.vue'

export const pivotChart: ChartDefinition = {
  type: 'pivot',
  label: '透视表',
  group: 'table',
  summary: '按行和列交叉汇总',
  order: 20,
  FeatureForm: PivotFeatureForm,
  StyleForm: CardChromeStyleForm,
}
