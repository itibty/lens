<!--
 * @Description: 进度条预设配色（填充 / 轨道，双色圆点）
-->
<script setup lang="ts">
import type { VisProgressColorPresetId } from '@/views/vis/shared/progressCard'
import type { VisVisualConfig } from '@/views/vis/shared/types'
import {
  PROGRESS_COLOR_PRESETS,
  progressColorPatch,
  progressColorPreview,
  resolveProgressColorPreset,
} from '@/views/vis/shared/progressCard'
import { useVisualBranch } from './composables/useVisualBranch'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const branch = useVisualBranch(visual, 'progress')

const presetId = computed(() => resolveProgressColorPreset(visual.value))
const chips = computed(() =>
  PROGRESS_COLOR_PRESETS.map((item) => {
    const [fill, track] = progressColorPreview(item)
    return { ...item, fill, track }
  }),
)

function selectPreset(id: VisProgressColorPresetId) {
  const patch = progressColorPatch(id)
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
