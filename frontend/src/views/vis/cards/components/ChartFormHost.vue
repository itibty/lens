<!--
 * @Description: 功能 / 样式表单宿主 —— 按注册表挂载 FeatureForm 或 StyleForm
-->
<script setup lang="ts">
import type { DatasetField, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { getChartDefinition } from '@/views/vis/charts'

const props = defineProps<{
  mode: 'feature' | 'style'
  query?: VisQueryConfig
  fields?: DatasetField[]
}>()

const visual = defineModel<VisVisualConfig>('visual', { required: true })

const chartDef = computed(() => getChartDefinition(visual.value.chartType))

const Form = computed(() =>
  props.mode === 'feature'
    ? chartDef.value?.FeatureForm
    : chartDef.value?.StyleForm,
)

const emptyText = computed(() =>
  props.mode === 'feature'
    ? '当前图表暂无可配功能'
    : '当前图表暂无风格选项',
)

const showEmpty = computed(() => !Form.value)
</script>

<template>
  <div class="chart-form-host">
    <component
      :is="Form"
      v-if="Form"
      v-model:visual="visual"
      :query="query"
      :fields="fields"
    />
    <el-text
      v-if="showEmpty"
      type="info"
      size="small"
    >
      {{ emptyText }}
    </el-text>
  </div>
</template>

<style scoped lang="scss">
.chart-form-host {
  padding: 0 0 4px;
}
</style>
