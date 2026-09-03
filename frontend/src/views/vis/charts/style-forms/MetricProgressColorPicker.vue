<!--
 * @Description: 表格指标单元格数据条预设色
-->
<script setup lang="ts">
import type { MetricProgressColorPresetId } from '@/views/vis/shared/metricCell'
import {
  METRIC_PROGRESS_COLOR_PRESETS,
  metricProgressColor,
  resolveMetricProgressColorPreset,
} from '@/views/vis/shared/metricCell'

const color = defineModel<string | undefined>({ required: true })
const presetId = computed(() => resolveMetricProgressColorPreset(color.value))

function selectPreset(id: MetricProgressColorPresetId) {
  color.value = metricProgressColor(id)
}
</script>

<template>
  <div class="accent-chips">
    <button
      v-for="item in METRIC_PROGRESS_COLOR_PRESETS"
      :key="item.id"
      type="button"
      class="accent-chip"
      :class="{ 'is-active': presetId === item.id }"
      :title="item.label"
      :aria-label="item.label"
      :aria-pressed="presetId === item.id"
      @click="selectPreset(item.id)"
    >
      <i :style="{ background: item.preview }" />
    </button>
  </div>
</template>
