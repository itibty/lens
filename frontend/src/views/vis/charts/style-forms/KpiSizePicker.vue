<!--
 * @Description: 目标进度尺寸预设
-->
<script setup lang="ts">
import type { VisProgressSize, VisVisualConfig } from '@/views/vis/shared/types'
import { KPI_DEFAULTS, KPI_SIZE_PRESETS, kpiPickerSize, kpiSizeSpec } from '@/views/vis/shared/kpiCard'
import { useVisualBranch } from './composables/useVisualBranch'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const branch = useVisualBranch(visual, 'kpi')

const size = computed({
  get: () => kpiPickerSize(visual.value.kpi?.size ?? KPI_DEFAULTS.size),
  set: (value: VisProgressSize) => {
    if (value === KPI_DEFAULTS.size)
      branch.clearKey('size')
    else
      branch.patch({ size: value })
  },
})
</script>

<template>
  <div class="palette-picker">
    <button
      v-for="item in KPI_SIZE_PRESETS"
      :key="item.id"
      type="button"
      class="palette-row"
      :class="{ 'is-active': size === item.id }"
      :aria-pressed="size === item.id"
      @click="size = item.id"
    >
      <span class="palette-row__name">
        {{ item.name }}
      </span>
      <span class="palette-row__px">
        <template
          v-for="(n, i) in kpiSizeSpec(item)"
          :key="`${item.id}-${i}`"
        >
          <em v-if="i">/</em>{{ n }}<small>px</small>
        </template>
      </span>
    </button>
  </div>
</template>
