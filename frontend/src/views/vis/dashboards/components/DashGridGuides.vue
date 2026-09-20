<!-- 设计态辅助层：横纵网格常驻卡片下方，操作边界与尺寸提示在上方，不拦截鼠标。 -->
<script setup lang="ts">
import type { DashGuideItem } from '../dashGridGuides'
import { useElementSize } from '@vueuse/core'
import { useId } from 'vue'
import { DASH_MARGIN, DASH_ROW_HEIGHT } from '../config'
import { DASH_GUIDE_LABEL, dashAlignmentGuides, dashGridGeometry, dashGuideLabelPosition } from '../dashGridGuides'

const props = withDefaults(defineProps<{
  activeItem?: DashGuideItem
  items?: readonly DashGuideItem[]
}>(), { items: () => [] })
const MAJOR_STEP = 4
const root = ref<HTMLElement>()
const label = ref<HTMLElement>()
const { width, height } = useElementSize(root)
const { width: labelWidth } = useElementSize(label, { width: 0, height: 0 }, { box: 'border-box' })
const geometry = computed(() => dashGridGeometry(width.value))
const bounds = computed(() => props.activeItem && geometry.value?.rect(props.activeItem))
const alignments = computed(() => props.activeItem ? dashAlignmentGuides(width.value, props.activeItem, props.items) : [])
const rowPatternId = `dash-guide-rows-${useId()}`
const labelStyle = computed(() => {
  if (!bounds.value)
    return undefined
  const position = dashGuideLabelPosition(bounds.value, width.value, height.value, labelWidth.value)
  return {
    left: `${position.left}px`,
    top: `${position.top}px`,
    height: `${DASH_GUIDE_LABEL.height}px`,
  }
})
</script>

<template>
  <div ref="root" class="dash-grid-guides" aria-hidden="true">
    <svg v-if="geometry" class="dash-grid-guides__grid" width="100%" height="100%">
      <g class="dash-grid-guides__columns" :class="{ 'is-dense': geometry.width / geometry.columns.length < 24 }">
        <template v-for="(column, index) in geometry.columns" :key="index">
          <line :class="{ 'is-major': index % MAJOR_STEP === 0 }" :x1="column.start" y1="0" :x2="column.start" :y2="height" />
          <line :class="{ 'is-major': index === geometry.columns.length - 1 }" :x1="column.end" y1="0" :x2="column.end" :y2="height" />
        </template>
      </g>
      <defs>
        <pattern :id="rowPatternId" patternUnits="userSpaceOnUse" :width="geometry.width" :height="geometry.rowStep * MAJOR_STEP" :y="DASH_MARGIN[1]">
          <template v-for="row in MAJOR_STEP" :key="row">
            <line :class="{ 'is-major': row === 1 }" x1="0" :y1="(row - 1) * geometry.rowStep" :x2="geometry.width" :y2="(row - 1) * geometry.rowStep" />
            <line x1="0" :y1="(row - 1) * geometry.rowStep + DASH_ROW_HEIGHT" :x2="geometry.width" :y2="(row - 1) * geometry.rowStep + DASH_ROW_HEIGHT" />
          </template>
        </pattern>
      </defs>
      <rect width="100%" height="100%" :fill="`url(#${rowPatternId})`" stroke="none" />
    </svg>
    <template v-if="bounds && activeItem">
      <svg class="dash-grid-guides__edges" width="100%" height="100%">
        <g v-for="(guide, index) in alignments" :key="index" class="dash-grid-guides__alignment">
          <template v-if="guide.axis === 'x'">
            <line :x1="guide.position" :y1="guide.start" :x2="guide.position" :y2="guide.end" />
            <path :d="`M ${guide.position - 3} ${guide.start} h 6 M ${guide.position - 3} ${guide.end} h 6`" />
          </template>
          <template v-else>
            <line :x1="guide.start" :y1="guide.position" :x2="guide.end" :y2="guide.position" />
            <path :d="`M ${guide.start} ${guide.position - 3} v 6 M ${guide.end} ${guide.position - 3} v 6`" />
          </template>
        </g>
        <rect class="dash-grid-guides__selection" :x="bounds.left" :y="bounds.top" :width="bounds.width" :height="bounds.height" />
      </svg>
      <span ref="label" class="dash-grid-guides__size" :style="labelStyle">
        <span class="dash-grid-guides__measure">
          <span class="dash-grid-guides__value">{{ activeItem.w }}</span>
          <span class="dash-grid-guides__unit">列</span>
        </span>
        <span class="dash-grid-guides__times">×</span>
        <span class="dash-grid-guides__measure">
          <span class="dash-grid-guides__value">{{ activeItem.h }}</span>
          <span class="dash-grid-guides__unit">行</span>
        </span>
      </span>
    </template>
  </div>
</template>

<style scoped lang="scss">
.dash-grid-guides {
  position: absolute;
  inset: 0;
  pointer-events: none;
  user-select: none;
  --dash-guide-line: color-mix(in srgb, var(--dash-title, var(--na-text-strong)) 5%, transparent);
  --dash-guide-major: color-mix(in srgb, var(--dash-title, var(--na-text-strong)) 10%, transparent);
  --dash-guide-accent: var(--dash-accent, var(--na-color-primary));

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

    line {
      stroke: var(--dash-guide-line);
    }

    .is-major {
      stroke: var(--dash-guide-major);
    }
  }

  &__edges {
    z-index: 8;
    fill: none;
  }

  // 窄分组仍使用原栅格定位，只减少过密的背景参考线。
  &__columns.is-dense line:not(.is-major) {
    display: none;
  }

  &__alignment {
    stroke: color-mix(in srgb, var(--dash-guide-accent) 60%, transparent);

    line {
      stroke-dasharray: 3 4;
    }
  }

  &__selection {
    stroke: color-mix(in srgb, var(--dash-guide-accent) 80%, transparent);
    stroke-width: 1.5;
    rx: var(--dash-card-radius, 12px);
  }

  &__size {
    position: absolute;
    z-index: 9;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-sizing: border-box;
    max-width: calc(100% - 8px);
    padding: 2px 0;
    border: 1px solid var(--na-border-color-lighter, var(--el-border-color-lighter));
    border-radius: 4px;
    color: var(--na-text-strong, var(--el-text-color-primary));
    font-size: var(--vis-caption-size);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
    line-height: 18px;
    white-space: nowrap;
  }

  &__measure {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
  }

  &__value {
    font-weight: 600;
  }

  &__unit,
  &__times {
    color: var(--na-text-muted, var(--el-text-color-secondary));
    font-size: 11px;
  }
}
</style>
