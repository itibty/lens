<!--
 * @Description: 进度条尺寸预设
-->
<script setup lang="ts">
import type { VisProgressSize, VisVisualConfig } from '@/views/vis/shared/types'
import { PROGRESS_DEFAULTS, PROGRESS_SIZE_PRESETS, progressSizeSpec } from '@/views/vis/shared/progressCard'
import { useVisualBranch } from './composables/useVisualBranch'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const branch = useVisualBranch(visual, 'progress')

const size = computed({
  get: () => visual.value.progress?.size ?? PROGRESS_DEFAULTS.size,
  set: (value: VisProgressSize) => {
    if (value === PROGRESS_DEFAULTS.size)
      branch.clearKey('size')
    else
      branch.patch({ size: value })
  },
})
</script>

<template>
  <div class="palette-picker">
    <button
      v-for="item in PROGRESS_SIZE_PRESETS"
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
          v-for="(n, i) in progressSizeSpec(item)"
          :key="`${item.id}-${i}`"
        >
          <em v-if="i">/</em>{{ n }}<small>px</small>
        </template>
      </span>
    </button>
  </div>
</template>
