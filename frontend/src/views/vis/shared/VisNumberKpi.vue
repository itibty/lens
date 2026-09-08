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

import VisMetricAux from './VisMetricAux.vue'
import VisMetricValue from './VisMetricValue.vue'

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
const { vars: cardStyle } = useNumberFit(rootRef, () => props.fill)
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
        <VisMetricValue
          :body="view.body"
          :prefix="view.prefix"
          :compact-suffix="view.compactSuffix"
          :suffix="view.suffix"
        />
      </div>
    </div>
    <VisMetricAux
      v-if="view.auxiliaries.length"
      class="vis-number-kpi__deltas"
      :items="view.auxiliaries"
      :show-label="style.showAuxLabel"
    />
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
    flex-shrink: 0;
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
    color: var(--vis-muted-color, var(--el-text-color-secondary));
  }

  &__value {
    display: flex;
    align-items: baseline;
    flex-wrap: nowrap;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    color: var(--vis-content-color, var(--el-text-color-primary));
    white-space: nowrap;

    &.is-interactive {
      cursor: pointer;

      &:hover {
        opacity: 0.88;
      }
    }
  }

  &__deltas {
    padding-top: var(--vis-metric-aux-gap, var(--vis-number-gap, 14px));
  }
}
</style>
