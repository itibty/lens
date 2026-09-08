<!-- 设计态辅助层：列线在卡片下方，操作边界与尺寸提示在上方，不拦截鼠标。 -->
<script setup lang="ts">
import type { DashLayoutRect } from '../dashLayout'
import { useElementSize } from '@vueuse/core'
import { useId } from 'vue'
import { DASH_MARGIN, DASH_ROW_HEIGHT } from '../config'
import { dashGridGeometry } from '../dashGridGuides'

const props = defineProps<{ activeItem?: DashLayoutRect }>()
const root = ref<HTMLElement>()
const { width, height } = useElementSize(root)
const geometry = computed(() => dashGridGeometry(width.value))
const bounds = computed(() => props.activeItem && geometry.value?.rect(props.activeItem))
const rowPatternId = `dash-guide-rows-${useId()}`
const labelStyle = computed(() => bounds.value && ({
  left: `${Math.max(4, Math.min(bounds.value.left + 8, width.value - 144))}px`,
  top: `${Math.max(4, bounds.value.top + 8)}px`,
}))
</script>

<template>
  <div ref="root" class="dash-grid-guides" :class="{ 'is-active': !!bounds }" aria-hidden="true">
    <svg v-if="geometry" class="dash-grid-guides__grid" width="100%" height="100%">
      <g class="dash-grid-guides__columns">
        <template v-for="(column, index) in geometry.columns" :key="index">
          <line :x1="column.start" y1="0" :x2="column.start" :y2="height" />
          <line :x1="column.end" y1="0" :x2="column.end" :y2="height" />
        </template>
      </g>
      <template v-if="bounds">
        <defs>
          <pattern :id="rowPatternId" patternUnits="userSpaceOnUse" :width="geometry.width" :height="geometry.rowStep" :y="DASH_MARGIN[1]">
            <path :d="`M 0 0 H ${geometry.width} M 0 ${DASH_ROW_HEIGHT} H ${geometry.width}`" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" :fill="`url(#${rowPatternId})`" stroke="none" />
      </template>
    </svg>
    <template v-if="bounds && activeItem">
      <svg class="dash-grid-guides__edges" width="100%" height="100%">
        <line :x1="bounds.left" y1="0" :x2="bounds.left" :y2="height" />
        <line :x1="bounds.left + bounds.width" y1="0" :x2="bounds.left + bounds.width" :y2="height" />
        <line x1="0" :y1="bounds.top" :x2="width" :y2="bounds.top" />
        <line x1="0" :y1="bounds.top + bounds.height" :x2="width" :y2="bounds.top + bounds.height" />
      </svg>
      <span class="dash-grid-guides__size" :style="labelStyle">宽 {{ activeItem.w }} 列 · 高 {{ activeItem.h }} 行</span>
    </template>
  </div>
</template>

<style scoped lang="scss">
.dash-grid-guides {
  position: absolute;
  inset: 0;
  pointer-events: none;
  user-select: none;
  --dash-guide-line: color-mix(in srgb, var(--dash-title, var(--na-text-strong)) 8%, transparent);

  &.is-active {
    --dash-guide-line: color-mix(in srgb, var(--dash-title, var(--na-text-strong)) 14%, transparent);
  }

  &__grid,
  &__edges {
    position: absolute;
    inset: 0;
    overflow: hidden;
    stroke-width: 1;
    shape-rendering: crispEdges;
  }

  &__grid {
    z-index: 0;
    stroke: var(--dash-guide-line);
  }

  &__edges {
    z-index: 8;
    stroke: color-mix(in srgb, var(--dash-accent, var(--na-color-primary)) 65%, transparent);
    stroke-dasharray: 4 3;
  }

  &__size {
    position: absolute;
    z-index: 9;
    box-sizing: border-box;
    max-width: calc(100% - 8px);
    padding: 3px 8px;
    border: 1px solid var(--na-color-primary-border);
    border-radius: var(--vis-radius-sm);
    background: var(--dash-card-bg, var(--na-surface-bg));
    box-shadow: var(--na-shadow-surface);
    color: var(--dash-accent, var(--na-color-primary));
    font-size: var(--vis-caption-size);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    line-height: 18px;
    white-space: nowrap;
  }
}
</style>
