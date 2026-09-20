<script setup lang="ts">
import type { QueryIssue } from '@/views/vis/cards/chartShape'
import type { VisAxisOptions, VisAxisRole, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { CARD_INPUT_PLACEHOLDERS } from '@/views/vis/charts/chartHelp'
import { chartHasSeries, chartMetricAliases, isDualAxisEnabled, resolveChartOptions, resolveSecondaryFields } from '@/views/vis/shared/chartOptions'
import StyleFormLabel from './StyleFormLabel.vue'
import StyleFormSection from './StyleFormSection.vue'

const props = defineProps<{ query?: VisQueryConfig, issues?: QueryIssue[] }>()
const visual = defineModel<VisVisualConfig>('visual', { required: true })
const openSections = defineModel<(string | number)[]>('openSections', { required: true })
const role = ref<VisAxisRole>('category')
const aliases = computed(() => chartMetricAliases(props.query))
const secondary = computed(() => isDualAxisEnabled(visual.value, visual.value.chartType, aliases.value)
  ? resolveSecondaryFields(visual.value, aliases.value, visual.value.chartType)
  : [])
const roles = computed(() => [
  { value: 'category' as const, label: '类目轴' },
  ...(secondary.value.length < aliases.value.length ? [{ value: 'primary' as const, label: '主数值轴' }] : []),
  ...(secondary.value.length ? [{ value: 'secondary' as const, label: '副数值轴' }] : []),
])
watch(roles, (items) => {
  if (!items.some(item => item.value === role.value))
    role.value = 'category'
})
const options = computed(() => resolveChartOptions(visual.value, visual.value.chartType, chartHasSeries(visual.value.chartType, props.query)))
const isPercent = computed(() => visual.value.chartType === 'bar' && options.value.percent && !isDualAxisEnabled(visual.value, visual.value.chartType, aliases.value))
const axis = computed(() => visual.value.chart?.axes?.[role.value] ?? {})
const defaultTitleVisible = computed(() => role.value !== 'category'
  && (visual.value.chartType === 'combo' || isDualAxisEnabled(visual.value, visual.value.chartType, aliases.value)))
const issue = computed(() => props.issues?.find(item =>
  item.shelf === 'appearance' && item.uid === `axis:${role.value}`,
)?.message)
watch(() => props.issues, (issues, previous) => {
  const first = issues?.find(item => item.shelf === 'appearance' && !previous?.includes(item))
  const target = first && roles.value.find(item => first.uid === `axis:${item.value}`)
  if (target) {
    role.value = target.value
    expandSection()
  }
}, { immediate: true })
function expandSection() {
  if (!openSections.value.includes('axes'))
    openSections.value = [...openSections.value, 'axes']
}
function patch(key: keyof VisAxisOptions, value: unknown) {
  const next = { ...axis.value, [key]: value }
  if (value == null || value === '' || value === 'auto')
    delete next[key]
  visual.value.chart = { ...visual.value.chart, axes: { ...visual.value.chart?.axes, [role.value]: next } }
}
</script>

<template>
  <StyleFormSection title="坐标轴" name="axes">
    <template #extra>
      <el-select v-model="role" size="small" aria-label="切换坐标轴" @change="expandSection">
        <el-option v-for="item in roles" :key="item.value" :value="item.value" :label="item.label" />
      </el-select>
    </template>
    <slot />
    <div class="vis-feature-group">
      <div class="vis-style-form__row">
        <StyleFormLabel>显示标题</StyleFormLabel>
        <el-switch :model-value="axis.showTitle ?? defaultTitleVisible" size="small" @update:model-value="patch('showTitle', $event)" />
      </div>
      <div v-if="axis.showTitle ?? defaultTitleVisible" class="vis-style-form__row is-child">
        <StyleFormLabel>
          标题
        </StyleFormLabel>
        <el-input :model-value="axis.title ?? ''" size="small" class="vis-style-form__control" :placeholder="CARD_INPUT_PLACEHOLDERS.title" clearable :maxlength="100" @update:model-value="patch('title', $event)" />
      </div>
      <template v-if="role !== 'category' && !isPercent">
        <div class="vis-style-form__row">
          <StyleFormLabel>最小值</StyleFormLabel>
          <el-input-number :model-value="axis.min" size="small" class="vis-style-form__control" placeholder="自动" :controls="false" @update:model-value="patch('min', $event)" />
        </div>
        <div class="vis-style-form__row">
          <StyleFormLabel>最大值</StyleFormLabel>
          <el-input-number :model-value="axis.max" size="small" class="vis-style-form__control" placeholder="自动" :controls="false" @update:model-value="patch('max', $event)" />
        </div>
        <el-text v-if="issue" type="danger" size="small">
          {{ issue }}
        </el-text>
        <div class="vis-style-form__row">
          <StyleFormLabel>零点</StyleFormLabel>
          <el-select :model-value="axis.zero ?? 'auto'" size="small" class="vis-style-form__control" :disabled="axis.min != null || axis.max != null" @update:model-value="patch('zero', $event)">
            <el-option value="auto" label="自动" />
            <el-option value="include" label="包含零点" />
            <el-option value="data" label="按数据范围" />
          </el-select>
        </div>
      </template>
    </div>
  </StyleFormSection>
</template>
