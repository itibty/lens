<!--
 * @Description: 进度条内容（条形 / 环形：当前值 / 目标值）
-->
<script setup lang="ts">
import type { ProgressView } from '@/views/vis/shared/progressCard'
import type { VisVisualConfig } from '@/views/vis/shared/types'
import {
  progressRingGeom,
  progressSizeVars,
  resolveProgressOptions,
  resolveProgressPaint,
  resolveProgressView,
} from '@/views/vis/shared/progressCard'

const props = withDefaults(defineProps<{
  visual: VisVisualConfig
  query?: VIS.QueryConfig
  data?: VIS.QueryDataResponse
  /** 传入则不再从 query / data 解析，给文本卡静态进度用 */
  view?: ProgressView | null
  emptyText?: string
  interactive?: boolean
}>(), {
  emptyText: '暂无数据',
  interactive: false,
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
const ring = computed(() => progressRingGeom(options.value.size))
const playRatio = ref(0)
const ringOffset = computed(() => ring.value.circ * (1 - playRatio.value))

const cardStyle = computed(() => ({
  ...progressSizeVars(options.value.size),
  '--vis-progress-fill': paint.value.fill,
}))
const barStyle = computed(() => ({
  width: `${playRatio.value * 100}%`,
}))

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
    class="vis-progress-card is-empty"
  >
    {{ emptyText }}
  </div>
  <div
    v-else
    class="vis-progress-card"
    :class="[`is-${options.shape}`, { 'is-interactive': interactive }]"
    :style="cardStyle"
    @click="onCardClick"
  >
    <div
      v-if="options.showLabel || (options.showPercent && options.shape === 'bar')"
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
        v-if="options.showPercent && options.shape === 'bar'"
        class="vis-progress-card__percent"
      >
        {{ resolved.percentText }}
      </div>
    </div>

    <div
      v-if="options.shape === 'ring'"
      class="vis-progress-card__ring-wrap"
    >
      <svg
        class="vis-progress-card__ring"
        :width="ring.size"
        :height="ring.size"
        :viewBox="`0 0 ${ring.size} ${ring.size}`"
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
          :stroke-dasharray="ring.circ"
          :stroke-dashoffset="ringOffset"
          :transform="`rotate(-90 ${ring.cx} ${ring.cx})`"
        />
      </svg>
      <div
        v-if="options.showPercent"
        class="vis-progress-card__ring-percent"
      >
        {{ resolved.percentText }}
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

  &.is-ring {
    align-items: center;
  }

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    min-width: 0;
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

  &__ring-wrap {
    position: relative;
    width: var(--vis-progress-ring, 120px);
    height: var(--vis-progress-ring, 120px);
    margin-bottom: var(--vis-progress-gap, 6px);

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__ring {
    display: block;
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
}
</style>
