<!--
 * @Description: 指标卡预设配色（主值色）
-->
<script setup lang="ts">
import type { VisNumberColorPresetId } from '@/views/vis/shared/numberStyle'
import type { VisVisualConfig } from '@/views/vis/shared/types'
import {
  NUMBER_COLOR_PRESETS,
  numberColorPatch,
  numberColorPreview,
  resolveNumberColorPreset,
} from '@/views/vis/shared/numberStyle'
import { useVisualBranch } from './composables/useVisualBranch'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const branch = useVisualBranch(visual, 'number')

const presetId = computed(() => resolveNumberColorPreset(visual.value))

function selectPreset(id: VisNumberColorPresetId) {
  const patch = numberColorPatch(id)
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
      v-for="item in NUMBER_COLOR_PRESETS"
      :key="item.id"
      type="button"
      class="accent-chip"
      :class="{ 'is-active': presetId === item.id }"
      :title="item.label"
      :aria-label="item.label"
      :aria-pressed="presetId === item.id"
      @click="selectPreset(item.id)"
    >
      <i :style="{ background: numberColorPreview(item)[0] }" />
    </button>
  </div>
</template>
