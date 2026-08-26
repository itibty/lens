<!--
 * @Description: 目标进度预设配色（填充 / 轨道）
-->
<script setup lang="ts">
import type { VisProgressColorPresetId } from '@/views/vis/shared/progressCard'
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { KPI_COLOR_PRESETS, kpiColorPatch, kpiColorPreview, resolveKpiColorPreset } from '@/views/vis/shared/kpiCard'
import { useVisualBranch } from './composables/useVisualBranch'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const branch = useVisualBranch(visual, 'kpi')

const presetId = computed(() => resolveKpiColorPreset(visual.value))
const chips = computed(() =>
  KPI_COLOR_PRESETS.map((item) => {
    const [fill, track] = kpiColorPreview(item)
    return { ...item, fill, track }
  }),
)

function selectPreset(id: VisProgressColorPresetId) {
  const patch = kpiColorPatch(id)
  if (!patch) {
    branch.clearKey('color')
    branch.clearKey('trackColor')
    return
  }
  branch.patch(patch)
}
</script>

<template>
  <div class="accent-chips">
    <button
      v-for="item in chips"
      :key="item.id"
      type="button"
      class="accent-chip is-pair"
      :class="{ 'is-active': presetId === item.id }"
      :title="item.label"
      :aria-label="`${item.label}，填充与轨道`"
      :aria-pressed="presetId === item.id"
      @click="selectPreset(item.id)"
    >
      <i :style="{ background: item.track }">
        <b :style="{ background: item.fill }" />
      </i>
    </button>
  </div>
</template>
