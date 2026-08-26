import type { ChartDefinition } from '../types'
import CardChromeStyleForm from '../style-forms/CardChromeStyleForm.vue'
import TableFeatureForm from '../style-forms/TableFeatureForm.vue'

export const tableChart: ChartDefinition = {
  type: 'table',
  label: '表格',
  group: 'table',
  summary: '逐行查看、核对明细',
  order: 10,
  FeatureForm: TableFeatureForm,
  StyleForm: CardChromeStyleForm,
}
