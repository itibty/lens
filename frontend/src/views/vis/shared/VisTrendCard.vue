<!--
 * @Description: 趋势卡（主值 + 较上期 + 迷你走势）
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { useResizeObserver } from '@vueuse/core'
import { VIS_EMPTY_TEXT } from '@/views/vis/shared/emptyState'
import { scaleNumberPx, useNumberFit } from '@/views/vis/shared/numberFit'
import {
  resolveNumberStyle,
  resolveNumberValueColor,
} from '@/views/vis/shared/numberStyle'
import { resolveTrendOptions, resolveTrendView, sparklineGeom } from '@/views/vis/shared/trendCard'

import VisMetricAux from './VisMetricAux.vue'
import VisMetricValue from './VisMetricValue.vue'

const props = withDefaults(defineProps<{
  visual: VisVisualConfig
  query: VIS.QueryConfig
  data: VIS.QueryDataResponse
  emptyText?: string
  interactive?: boolean
  fill?: boolean
  autoHeight?: boolean
}>(), {
  emptyText: VIS_EMPTY_TEXT,
  interactive: false,
  fill: false,
  autoHeight: false,
})

const emit = defineEmits<{
  detailClick: [payload: { record: Record<string, unknown>, clientX: number, clientY: number }]
}>()

const style = computed(() => resolveNumberStyle(props.visual))
const opt = computed(() => resolveTrendOptions(props.visual))
const view = computed(() => resolveTrendView(props.query, props.data, props.visual))
const valueColor = computed(() => resolveNumberValueColor(props.visual))
const rootRef = ref<HTMLElement>()
const sparkSlotRef = ref<HTMLElement>()
const { scale, vars: cardStyle } = useNumberFit(rootRef, () => props.fill)
const sparkUid = useId().replace(/[^\w-]/g, '')
const sparkFillId = `vis-trend-fill-${sparkUid}`
const sparkBox = reactive({ w: 240, h: 0 })
const SPARK_BASE = 40

const sparkW = computed(() => sparkBox.w >= 8 ? Math.round(sparkBox.w) : 240)
const sparkH = computed(() => {
  if (props.fill && sparkBox.h >= 8)
    return Math.round(sparkBox.h)
  return Math.max(20, Math.round(scaleNumberPx(SPARK_BASE, scale.value)))
})
const sparkPad = computed(() => Math.max(4, Math.round(sparkH.value * 0.08)))
const spark = computed(() => {
  if (!view.value?.points.length)
    return { line: '', area: '', last: null }
  try {
    return sparklineGeom(view.value.points, sparkW.value, sparkH.value, sparkPad.value)
  }
  catch {
    return { line: '', area: '', last: null }
  }
})

useResizeObserver(sparkSlotRef, (entries) => {
  const rect = entries[0]?.contentRect
  if (!rect || (rect.width < 8 && rect.height < 8))
    return
  if (Math.abs(rect.width - sparkBox.w) < 1 && Math.abs(rect.height - sparkBox.h) < 1)
    return
  sparkBox.w = rect.width
  sparkBox.h = rect.height
})

function onValueClick(event: MouseEvent) {
  if (!props.interactive || !view.value?.lastRow)
    return
  emit('detailClick', {
    record: view.value.lastRow,
    clientX: event.clientX,
    clientY: event.clientY,
  })
}
</script>

<template>
  <div
    v-if="view"
    ref="rootRef"
    class="vis-trend-card"
    :class="{ 'is-fill': fill, 'is-auto-height': autoHeight, 'has-spark': fill && opt.showSparkline }"
    :style="cardStyle"
  >
    <div class="vis-trend-card__hero">
      <div
        v-if="style.showLabel"
        class="vis-trend-card__name"
      >
        {{ view.label }}
      </div>
      <div class="vis-trend-card__row">
        <div
          class="vis-trend-card__value"
          :class="{ 'is-interactive': interactive }"
          :style="valueColor ? { color: valueColor } : undefined"
          @click="onValueClick"
        >
          <VisMetricValue
            :body="view.body"
            :prefix="view.prefix"
            :compact-suffix="view.compactSuffix"
            :suffix="view.suffix"
          />
        </div>
        <div
          v-if="view.changeText"
          class="vis-trend-card__change"
          :class="`is-${view.changeDirection}`"
        >
          <VisMetricValue :body="view.changeText" size="aux" />
        </div>
      </div>
    </div>
    <div
      v-if="opt.showSparkline"
      ref="sparkSlotRef"
      class="vis-trend-card__spark-slot"
      :style="fill ? undefined : { height: `${sparkH}px` }"
    >
      <svg
        v-if="spark.line"
        class="vis-trend-card__spark"
        :viewBox="`0 0 ${sparkW} ${sparkH}`"
        :style="{ color: valueColor || undefined }"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            :id="sparkFillId"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stop-color="currentColor"
              stop-opacity="0.2"
            />
            <stop
              offset="100%"
              stop-color="currentColor"
              stop-opacity="0"
            />
          </linearGradient>
        </defs>
        <path
          v-if="spark.area"
          class="vis-trend-card__spark-fill"
          :d="spark.area"
          :fill="`url(#${sparkFillId})`"
        />
        <path
          class="vis-trend-card__spark-line"
          :d="spark.line"
        />
      </svg>
    </div>
    <VisMetricAux
      v-if="view.auxiliaries.length"
      class="vis-trend-card__aux"
      :items="view.auxiliaries"
      :show-label="style.showAuxLabel"
    />
  </div>
  <div
    v-else
    class="vis-trend-card is-empty"
    :class="{ 'is-fill': fill }"
  >
    {{ emptyText }}
  </div>
</template>

<style scoped lang="scss">
.vis-trend-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--vis-number-gap, 14px);
  width: 100%;
  min-width: 0;
  color: var(--vis-content-color, var(--el-text-color-primary));

  &.is-fill {
    flex: 1 1 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    justify-content: center;

    &.has-spark {
      justify-content: flex-start;
    }
  }

  &.is-fill.is-auto-height {
    flex: 0 0 auto;
    height: auto;
    overflow: visible;
  }

  &.is-empty {
    align-items: center;
    justify-content: center;
    min-height: 80px;
    font-size: 13px;
    color: var(--vis-empty-color, var(--el-text-color-placeholder));
  }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--vis-number-name, 15px);
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1.3;
    color: var(--vis-muted-color, var(--el-text-color-secondary));
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px 12px;
    min-width: 0;
  }

  &__value {
    display: flex;
    align-items: baseline;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--vis-content-color, var(--el-text-color-primary));
    white-space: nowrap;

    &.is-interactive {
      cursor: pointer;

      &:hover {
        opacity: 0.88;
      }
    }
  }

  &__change {
    position: relative;
    z-index: 1;
    flex: 0 0 auto;
    max-width: 100%;
    white-space: nowrap;

    &.is-up {
      color: var(--el-color-success);
    }

    &.is-down {
      color: var(--el-color-danger);
    }

    &.is-flat {
      color: var(--vis-muted-color, var(--el-text-color-secondary));
    }
  }

  &__hero {
    flex-shrink: 0;
    min-width: 0;
  }

  &__spark-slot {
    position: relative;
    flex: 0 0 auto;
    width: 100%;
    min-width: 0;

    .is-fill & {
      flex: 1 1 0;
      min-height: 28px;
    }

    .is-fill.is-auto-height & {
      flex: 0 0 var(--vis-trend-spark-height, 64px);
      height: var(--vis-trend-spark-height, 64px);
      min-height: var(--vis-trend-spark-height, 64px);
    }
  }

  &__spark {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    color: var(--vis-content-color, currentColor);

    .is-fill & {
      position: absolute;
      inset: 0;
    }
  }

  &__spark-fill {
    pointer-events: none;
  }

  &__spark-line {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  &__aux {
    padding-top: 8px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  &.is-auto-height &__aux {
    min-height: auto;
    overflow-y: visible;
  }
}
</style>
