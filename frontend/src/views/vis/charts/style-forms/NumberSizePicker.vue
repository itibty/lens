<!--
 * @Description: 指标卡尺寸预设
-->
<script setup lang="ts">
import type { VisNumberSize, VisVisualConfig } from '@/views/vis/shared/types'
import { NUMBER_SIZE_PRESETS, NUMBER_STYLE_DEFAULTS, numberSizeOf, numberSizeSpec } from '@/views/vis/shared/numberStyle'
import { useVisualBranch } from './composables/useVisualBranch'

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const branch = useVisualBranch(visual, 'number')

const size = computed({
  get: () => numberSizeOf(visual.value.number?.size).id,
  set: (value: VisNumberSize) => {
    if (value === NUMBER_STYLE_DEFAULTS.size)
      branch.clearKey('size')
    else
      branch.patch({ size: value })
  },
})
</script>

<template>
  <div class="palette-picker">
    <button
      v-for="item in NUMBER_SIZE_PRESETS"
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
          v-for="(n, i) in numberSizeSpec(item)"
          :key="`${item.id}-${i}`"
        >
          <em v-if="i">/</em>{{ n }}<small>px</small>
        </template>
      </span>
    </button>
  </div>
</template>
