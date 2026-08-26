<!--
 * @Description: 配色预设（几何图系列色 / 热力连续色带 / 表格表头）
-->
<script setup lang="ts">
import type { VisChartThemeId, VisVisualConfig } from '@/views/vis/shared/types'
import { chartSeriesPalettes, DEFAULT_CHART_THEME, resolveChartThemeId, showsPaletteAsGradient } from '@/views/vis/shared/chartPalette'
import { TABLE_COLOR_PRESETS } from '@/views/vis/shared/vtableTheme'

const props = withDefaults(defineProps<{
  variant?: 'series' | 'table'
}>(), {
  variant: 'series',
})

const visual = defineModel<VisVisualConfig>('visual', { required: true })
const palettes = computed(() =>
  props.variant === 'table' ? TABLE_COLOR_PRESETS : chartSeriesPalettes(visual.value.chartType),
)

const themeId = computed({
  get: () => {
    const id = resolveChartThemeId(visual.value)
    return palettes.value.some(item => item.id === id) ? id : DEFAULT_CHART_THEME
  },
  set: (value: VisChartThemeId) => {
    if (value === DEFAULT_CHART_THEME)
      delete visual.value.chartTheme
    else
      visual.value.chartTheme = value
  },
})

function selectTheme(id: VisChartThemeId) {
  themeId.value = id
}
</script>

<template>
  <div class="palette-picker">
    <button
      v-for="item in palettes"
      :key="item.id"
      type="button"
      class="palette-row"
      :class="{ 'is-active': themeId === item.id }"
      :aria-label="item.label"
      :aria-pressed="themeId === item.id"
      @click="selectTheme(item.id)"
    >
      <span class="palette-row__name">
        {{ item.label }}
      </span>
      <span
        class="palette-row__strip"
        :style="showsPaletteAsGradient(visual.chartType, item.id) ? { background: `linear-gradient(90deg, ${item.palette.join(',')})` } : undefined"
        aria-hidden="true"
      >
        <template v-if="!showsPaletteAsGradient(visual.chartType, item.id)">
          <i
            v-for="(color, colorIndex) in item.palette"
            :key="`${item.id}-${colorIndex}`"
            :style="{ background: color }"
          />
        </template>
      </span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.palette-row__name {
  flex: 0 0 64px;
}
</style>
