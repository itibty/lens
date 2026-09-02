<!--
 * @Description: 进度条内容（条形 / 环形 / 大半环：当前值 / 目标值）
-->
<script setup lang="ts">
import type { ProgressView } from '@/views/vis/shared/progressCard'
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { useResizeObserver } from '@vueuse/core'
import {
  isProgressArc,
  progressRingGeom,
  resolveProgressOptions,
  resolveProgressPaint,
  resolveProgressView,
} from '@/views/vis/shared/progressCard'
import {
  fitProgressRingBox,
  scaleProgressRingPercent,
  useProgressFit,
} from '@/views/vis/shared/progressFit'

const props = withDefaults(defineProps<{
  visual: VisVisualConfig
  query?: VIS.QueryConfig
  data?: VIS.QueryDataResponse
  /** 传入则不再从 query / data 解析，给文本卡静态进度用 */
  view?: ProgressView | null
  emptyText?: string
  interactive?: boolean
  /** 铺满格子：字号、条高与环径随卡片走；设计器小预览不要开 */
  fill?: boolean
}>(), {
  emptyText: '暂无数据',
  interactive: false,
  fill: false,
})

const emit = defineEmits<{
  detailClick: [payload: { clientX: number, clientY: number }]
}>()

function onCardClick(event: MouseEvent) {
  if (!props.interactive)
    return
  emit('detailClick', { clientX: event.clientX, clientY: event.clientY })
}

const options = computed(() => resolveProgressOptions(props.visual))
const resolved = computed(() => {
  if (props.view !== undefined)
    return props.view
  if (!props.query || !props.data)
    return null
  return resolveProgressView(props.query, props.data, props.visual)
})
const paint = computed(() => resolveProgressPaint(props.visual))
const isArc = computed(() => isProgressArc(options.value.shape))
const rootRef = ref<HTMLElement>()
const ringSlotRef = ref<HTMLElement>()
const ringBox = ref(0)
const { vars: fitVars } = useProgressFit(rootRef, () => props.fill)

const ring = computed(() => {
  const render = props.fill && ringBox.value > 0
    ? ringBox.value
    : undefined
  return progressRingGeom(options.value.shape, render)
})
const playRatio = ref(0)
const ringOffset = computed(() => ring.value.arc * (1 - playRatio.value))
const ringRotate = computed(() => `rotate(${ring.value.startDeg} ${ring.value.cx} ${ring.value.cx})`)

const cardStyle = computed(() => ({
  ...fitVars.value,
  ...(props.fill && isArc.value
    ? { '--vis-progress-ring-percent': scaleProgressRingPercent(ring.value.size) }
    : {}),
  ...(ring.value.isGauge
    ? { '--vis-progress-gauge-cy': `${ring.value.cyRatio * 100}%` }
    : {}),
  '--vis-progress-fill': paint.value.fill,
}))
const barStyle = computed(() => ({
  width: `${playRatio.value * 100}%`,
}))
const ringWrapStyle = computed(() => ({
  width: `${ring.value.width}px`,
  height: `${ring.value.height}px`,
}))

function applyRingBox(width: number, height: number) {
  if (!props.fill || !isArc.value) {
    ringBox.value = 0
    return
  }
  const next = fitProgressRingBox(width, height, options.value.shape)
  if (!next || Math.abs(next - ringBox.value) < 1)
    return
  ringBox.value = next
}

useResizeObserver(ringSlotRef, (entries) => {
  const rect = entries[0]?.contentRect
  if (!rect)
    return
  applyRingBox(rect.width, rect.height)
})

watch(() => [props.fill, isArc.value, options.value.shape] as const, () => {
  const el = ringSlotRef.value
  if (!el) {
    if (!props.fill || !isArc.value)
      ringBox.value = 0
    return
  }
  applyRingBox(el.clientWidth, el.clientHeight)
})

watch(
  () => [options.value.shape, resolved.value?.fillRatio] as const,
  async ([, ratio]) => {
    playRatio.value = 0
    if (ratio == null)
      return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      playRatio.value = ratio
      return
    }
    await nextTick()
    requestAnimationFrame(() => {
      playRatio.value = ratio
    })
  },
  { immediate: true },
)
</script>

<template>
  <div
    v-if="!resolved"
    ref="rootRef"
    class="vis-progress-card is-empty"
    :class="{ 'is-fill': fill }"
  >
    {{ emptyText }}
  </div>
  <div
    v-else
    ref="rootRef"
    class="vis-progress-card"
    :class="[`is-${options.shape}`, {
      'is-interactive': interactive,
      'is-fill': fill,
      'is-arc': isArc,
    }]"
    :style="cardStyle"
    @click="onCardClick"
  >
    <div
      v-if="isArc && options.showLabel"
      class="vis-progress-card__head"
    >
      <div class="vis-progress-card__label">
        {{ resolved.label }}
      </div>
    </div>

    <div
      v-if="!isArc && (options.showLabel || options.showPercent)"
      class="vis-progress-card__head"
      :class="{ 'is-solo': !options.showLabel }"
    >
      <div
        v-if="options.showLabel"
        class="vis-progress-card__label"
      >
        {{ resolved.label }}
      </div>
      <div
        v-if="options.showPercent"
        class="vis-progress-card__percent"
      >
        {{ resolved.percentText }}
      </div>
    </div>

    <div
      v-if="isArc"
      ref="ringSlotRef"
      class="vis-progress-card__ring-slot"
    >
      <div
        class="vis-progress-card__ring-wrap"
        :style="ringWrapStyle"
      >
        <svg
          class="vis-progress-card__ring"
          :width="ring.width"
          :height="ring.height"
          :viewBox="ring.viewBox"
          role="img"
          :aria-label="resolved.percentText"
        >
          <circle
            :cx="ring.cx"
            :cy="ring.cx"
            :r="ring.radius"
            fill="none"
            :stroke="paint.track"
            :stroke-width="ring.stroke"
            stroke-linecap="round"
            :stroke-dasharray="ring.trackDash"
            :transform="ring.isGauge ? ringRotate : undefined"
          />
          <circle
            class="vis-progress-card__ring-fill"
            :cx="ring.cx"
            :cy="ring.cx"
            :r="ring.radius"
            fill="none"
            :stroke="paint.fill"
            :stroke-width="ring.stroke"
            stroke-linecap="round"
            :stroke-dasharray="ring.fillDash"
            :stroke-dashoffset="ringOffset"
            :transform="ringRotate"
          />
        </svg>
        <div
          v-if="options.showPercent"
          class="vis-progress-card__ring-percent"
        >
          {{ resolved.percentText }}
        </div>
      </div>
    </div>

    <div
      v-else
      class="vis-progress-card__track"
      :class="{ 'is-filled': playRatio > 0 }"
      :style="{ background: paint.track }"
    >
      <div
        class="vis-progress-card__fill"
        :style="barStyle"
      />
    </div>

    <div
      v-if="options.showValue"
      class="vis-progress-card__values"
    >
      <span class="vis-progress-card__current">{{ resolved.currentText }}</span>
      <span class="vis-progress-card__sep">/</span>
      <span class="vis-progress-card__target">{{ resolved.targetText }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.vis-progress-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  min-width: 0;

  &.is-empty {
    align-items: center;
    justify-content: center;
    min-height: 72px;
    font-size: 13px;
    color: var(--vis-content-color, var(--el-text-color-placeholder));
  }

  &.is-interactive {
    cursor: pointer;
  }

  &.is-arc {
    align-items: center;
  }

  &.is-fill {
    flex: 1 1 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  &.is-fill.is-arc {
    .vis-progress-card__ring-slot {
      flex: 1 1 0;
      min-height: 0;
      min-width: 0;
      width: 100%;
      height: auto;
    }
  }

  &.is-arc &__head,
  &.is-arc &__values {
    justify-content: center;
    text-align: center;
  }

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
    width: 100%;
    margin-bottom: var(--vis-progress-gap, 6px);

    &:last-child {
      margin-bottom: 0;
    }

    &.is-solo {
      justify-content: flex-start;
    }
  }

  &__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--vis-progress-label, 13px);
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1.3;
    color: var(--vis-muted-color, var(--el-text-color-secondary));
    opacity: 0.88;
  }

  &__percent {
    flex-shrink: 0;
    font-size: var(--vis-progress-percent, 22px);
    font-weight: 650;
    letter-spacing: -0.025em;
    line-height: 1.05;
    font-variant-numeric: tabular-nums lining-nums;
    color: var(--vis-progress-fill, var(--el-color-primary));
  }

  .is-solo &__percent {
    font-size: var(--vis-progress-percent, 22px);
  }

  &__track {
    width: 100%;
    height: var(--vis-progress-bar, 10px);
    margin-bottom: var(--vis-progress-gap, 6px);
    border-radius: 999px;

    &:last-child {
      margin-bottom: 0;
    }
    overflow: hidden;
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--el-border-color-lighter) 55%, transparent);
  }

  &__fill {
    height: 100%;
    border-radius: inherit;
    min-width: 0;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--vis-progress-fill, var(--el-color-primary)) 72%, var(--dash-card-bg, #fff)) 0%,
      var(--vis-progress-fill, var(--el-color-primary)) 100%
    );
    transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);

    .is-filled & {
      min-width: var(--vis-progress-bar, 10px);
    }
  }

  &__values {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: var(--vis-progress-values, 13px);
    line-height: 1.3;
    font-variant-numeric: tabular-nums;
  }

  &__current {
    font-weight: 600;
    color: var(--vis-content-color, var(--el-text-color-primary));
  }

  &__target {
    font-weight: 400;
    color: var(--vis-muted-color, var(--el-text-color-secondary));
    opacity: 0.82;
  }

  &__sep {
    opacity: 0.38;
    font-weight: 400;
    color: var(--vis-muted-color, var(--el-text-color-secondary));
  }

  &__ring-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--vis-progress-gap, 6px);

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__ring-wrap {
    position: relative;
    flex-shrink: 0;
  }

  &__ring {
    display: block;
    overflow: visible;
  }

  &__ring-fill {
    transition: stroke-dashoffset 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &__ring-percent {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--vis-progress-ring-percent, 20px);
    font-weight: 650;
    letter-spacing: -0.025em;
    font-variant-numeric: tabular-nums lining-nums;
    color: var(--vis-progress-fill, var(--el-color-primary));
  }

  &.is-gauge &__ring-percent {
    inset: unset;
    top: var(--vis-progress-gauge-cy, 50%);
    left: 50%;
    width: auto;
    height: auto;
    transform: translate(-50%, -50%);
  }
}
</style>
