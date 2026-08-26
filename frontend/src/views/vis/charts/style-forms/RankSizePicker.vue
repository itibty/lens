<!--
 * @Description: 排行榜尺寸预设
-->
<script setup lang="ts">
import type { VisProgressSize, VisVisualConfig } from '@/views/vis/shared/types'
import { RANK_DEFAULTS, RANK_SIZE_PRESETS, rankSizeOf, rankSizeSpec } from '@/views/vis/shared/rankCard'
import { useVisualBranch } from './composables/useVisualBranch'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const branch = useVisualBranch(visual, 'rank')

const size = computed({
  get: () => rankSizeOf(visual.value.rank?.size).id,
  set: (value: VisProgressSize) => {
    if (value === RANK_DEFAULTS.size)
      branch.clearKey('size')
    else
      branch.patch({ size: value })
  },
})
</script>

<template>
  <div class="palette-picker">
    <button
      v-for="item in RANK_SIZE_PRESETS"
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
          v-for="(n, i) in rankSizeSpec(item)"
          :key="`${item.id}-${i}`"
        >
          <em v-if="i">/</em>{{ n }}<small>px</small>
        </template>
      </span>
    </button>
  </div>
</template>
