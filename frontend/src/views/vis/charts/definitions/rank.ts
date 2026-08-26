import type { ChartDefinition } from '../types'
import RankFeatureForm from '../style-forms/RankFeatureForm.vue'
import RankStyleForm from '../style-forms/RankStyleForm.vue'

export const rankChart: ChartDefinition = {
  type: 'rank',
  label: '排行榜',
  group: 'compare',
  summary: '按指标排出名次和占比',
  order: 20,
  FeatureForm: RankFeatureForm,
  StyleForm: RankStyleForm,
}
