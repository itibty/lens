import type { ChartDefinition } from '../types'
import KpiFeatureForm from '../style-forms/KpiFeatureForm.vue'
import KpiStyleForm from '../style-forms/KpiStyleForm.vue'

export const kpiChart: ChartDefinition = {
  type: 'kpi',
  label: 'KPI图',
  group: 'metric',
  summary: '按维度看完成率，对照时间进度',
  order: 40,
  FeatureForm: KpiFeatureForm,
  StyleForm: KpiStyleForm,
}
