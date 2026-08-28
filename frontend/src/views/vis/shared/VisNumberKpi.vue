<!--
 * @Description: 指标卡内容（主值 + 同环比）
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import { resolveNumberView } from '@/views/vis/shared/numberCard'
import { useNumberFit } from '@/views/vis/shared/numberFit'
import {
  resolveNumberStyle,
  resolveNumberValueColor,
} from '@/views/vis/shared/numberStyle'

const props = withDefaults(defineProps<{
  visual: VisVisualConfig
  query: VIS.QueryConfig
  data: VIS.QueryDataResponse
  interactive?: boolean
  /** 铺满格子并按区域缩放字号；设计器预览不要开 */
  fill?: boolean
}>(), {
  interactive: false,
  fill: false,
})

const emit = defineEmits<{
  detailClick: [payload: { clientX: number, clientY: number }]
}>()

function onValueClick(event: MouseEvent) {
  if (!props.interactive)
    return
  emit('detailClick', { clientX: event.clientX, clientY: event.clientY })
}

const style = computed(() => resolveNumberStyle(props.visual))
const view = computed(() => resolveNumberView(props.query, props.data, props.visual))
const valueColor = computed(() => resolveNumberValueColor(props.visual))
const rootRef = ref<HTMLElement>()
const { vars: cardStyle } = useNumberFit(rootRef, () => style.value.size, () => props.fill)
</script>

<template>
  <div
    ref="rootRef"
    class="vis-number-kpi"
    :class="{ 'has-aux': view.auxiliaries.length, 'is-fill': fill }"
    :style="cardStyle"
  >
    <div
      class="vis-number-kpi__hero"
      :title="view.periodTitle || undefined"
    >
      <div
        v-if="style.showLabel"
        class="vis-number-kpi__name"
      >
        {{ view.label }}
      </div>
      <div
        class="vis-number-kpi__value"
        :class="{ 'is-interactive': interactive }"
        :style="valueColor ? { color: valueColor } : undefined"
        @click="onValueClick"
      >
        <span
          v-if="view.prefix"
          class="vis-number-kpi__affix is-prefix"
        >{{ view.prefix }}</span>
        <span class="vis-number-kpi__body">{{ view.body }}</span>
        <span
          v-if="view.compactSuffix"
          class="vis-number-kpi__affix is-suffix"
        >{{ view.compactSuffix }}</span>
      </div>
    </div>
    <div
      v-if="view.auxiliaries.length"
      class="vis-number-kpi__deltas"
    >
      <div
        v-for="item in view.auxiliaries"
        :key="item.key"
        class="vis-number-kpi__delta"
        :class="[`is-${item.direction}`, item.kind === 'metric' ? 'is-metric' : '']"
        :title="item.title || undefined"
      >
        <span class="vis-number-kpi__delta-value">
          <i
            v-if="item.kind !== 'metric' && item.direction !== 'flat'"
            class="vis-number-kpi__caret"
            aria-hidden="true"
          />
          {{ item.text }}
        </span>
        <span
          v-if="style.showAuxLabel"
          class="vis-number-kpi__delta-name"
        >{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.vis-number-kpi {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 0;
  width: 100%;
  min-width: 0;

  &.is-fill {
    flex: 1 1 0;
    height: 100%;
    min-height: 0;
    overflow: hidden;

    &.has-aux {
      justify-content: flex-start;
    }
  }

  &__hero {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    &[title] {
      cursor: help;
    }
  }

  &__name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--vis-number-name, 15px);
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1.3;
    color: var(--vis-content-color, var(--el-text-color-secondary));
    opacity: 0.88;
  }

  &__value {
    display: flex;
    align-items: baseline;
    flex-wrap: nowrap;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    font-size: var(--vis-number-value, 36px);
    font-weight: 650;
    letter-spacing: -0.025em;
    line-height: 1.05;
    color: var(--vis-content-color, var(--el-text-color-primary));
    white-space: nowrap;

    &.is-interactive {
      cursor: pointer;

      &:hover {
        opacity: 0.88;
      }
    }
  }

  &__affix {
    flex-shrink: 0;
    font-weight: 500;
    letter-spacing: 0;
    line-height: 1;
    opacity: 0.42;

    &.is-prefix {
      margin-right: 0.1em;
      font-size: 0.48em;
    }

    &.is-suffix {
      margin-left: 0.06em;
      font-size: 0.48em;
    }
  }

  &__body {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-variant-numeric: tabular-nums lining-nums;
  }

  &__deltas {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));
    gap: 6px 16px;
    padding-top: var(--vis-number-gap, 10px);
  }

  &__delta {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;

    &[title] {
      cursor: help;
    }

    &.is-up {
      --vis-kpi-delta: var(--el-color-success);
    }

    &.is-down {
      --vis-kpi-delta: var(--el-color-danger);
    }

    &.is-flat {
      --vis-kpi-delta: var(--vis-muted-color, var(--el-text-color-secondary));
    }

    &.is-metric {
      --vis-kpi-delta: var(--vis-content-color, var(--el-text-color-regular));
    }
  }

  &__delta-value {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: var(--vis-number-aux, 15px);
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.015em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    color: var(--vis-kpi-delta, var(--el-text-color-regular));
  }

  &__caret {
    flex-shrink: 0;
    width: 0;
    height: 0;
    border-left: 3.5px solid transparent;
    border-right: 3.5px solid transparent;

    .is-up & {
      border-bottom: 5px solid currentColor;
    }

    .is-down & {
      border-top: 5px solid currentColor;
    }
  }

  &__delta-name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--vis-number-aux-label, 11px);
    font-weight: 400;
    line-height: 1.25;
    color: var(--vis-muted-color, var(--el-text-color-secondary));
    opacity: 0.88;
  }
}
</style>
