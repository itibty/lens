<!--
 * @Description: 排行榜条颜色
-->
<script setup lang="ts">
import type { VisRankColorPresetId } from '@/views/vis/shared/rankCard'
import type { VisVisualConfig } from '@/views/vis/shared/types'
import {
  RANK_COLOR_PRESETS,
  rankColorPatch,
  rankColorPreview,
  resolveRankColorPreset,
} from '@/views/vis/shared/rankCard'
import { useVisualBranch } from './composables/useVisualBranch'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const branch = useVisualBranch(visual, 'rank')
const presetId = computed(() => resolveRankColorPreset(visual.value))

function selectPreset(id: VisRankColorPresetId) {
  const patch = rankColorPatch(id)
  if (!patch) {
    branch.clearKey('color')
    return
  }
  branch.patch(patch)
}
</script>

<template>
  <div class="accent-chips">
    <button
      v-for="item in RANK_COLOR_PRESETS"
      :key="item.id"
      type="button"
      class="accent-chip"
      :class="{ 'is-active': presetId === item.id }"
      :title="item.label"
      :aria-label="item.label"
      :aria-pressed="presetId === item.id"
      @click="selectPreset(item.id)"
    >
      <i :style="{ background: rankColorPreview(item)[0] }" />
    </button>
  </div>
</template>
