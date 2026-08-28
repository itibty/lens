<!--
 * @Description: 目标进度（按维横条 + 时间进度线）
-->
<script setup lang="ts">
import type { VisVisualConfig } from '@/views/vis/shared/types'
import {
  kpiSizeVars,
  resolveKpiOptions,
  resolveKpiPaint,
  resolveKpiView,
} from '@/views/vis/shared/kpiCard'

const props = withDefaults(defineProps<{
  visual: VisVisualConfig
  query: VIS.QueryConfig
  data: VIS.QueryDataResponse
  emptyText?: string
  interactive?: boolean
}>(), {
  emptyText: '暂无数据',
  interactive: false,
})

const emit = defineEmits<{
  detailClick: [payload: { record: Record<string, unknown>, clientX: number, clientY: number }]
}>()

const options = computed(() => resolveKpiOptions(props.visual))
const view = computed(() => resolveKpiView(props.query, props.data, props.visual))
const paint = computed(() => resolveKpiPaint(props.visual))
const cardStyle = computed(() => kpiSizeVars(options.value.size))
const play = ref(0)
const showPaceTag = computed(() => Boolean(view.value?.pace))
const paceLabelOnLeft = computed(() => (view.value?.pace?.fillRatio ?? 0) > 0.5)

watch(
  () => view.value?.rows.map(row => row.fillRatio).join(','),
  async () => {
    play.value = 0
    if (!view.value)
      return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      play.value = 1
      return
    }
    await nextTick()
    requestAnimationFrame(() => {
      play.value = 1
    })
  },
  { immediate: true },
)

function onRowClick(record: Record<string, unknown>, event: MouseEvent) {
  if (!props.interactive)
    return
  emit('detailClick', { record, clientX: event.clientX, clientY: event.clientY })
}
</script>

<template>
  <div
    v-if="!view"
    class="vis-kpi-card is-empty"
  >
    {{ emptyText }}
  </div>
  <div
    v-else
    class="vis-kpi-card"
    :style="cardStyle"
  >
    <div
      class="vis-kpi-card__list"
      :class="{
        'has-meta': options.showValue,
        'has-pace': Boolean(view.pace),
        'has-pace-label': showPaceTag,
      }"
    >
      <template
        v-for="(row, index) in view.rows"
        :key="row.key"
      >
        <div
          class="vis-kpi-card__name"
          :class="{ 'is-interactive': interactive }"
          :style="{ gridRow: index + 1 }"
          :title="row.label"
          @click="onRowClick(row.record, $event)"
        >
          {{ row.label }}
        </div>
        <div
          class="vis-kpi-card__plot"
          :class="{ 'is-interactive': interactive }"
          :style="{ gridRow: index + 1 }"
          @click="onRowClick(row.record, $event)"
        >
          <div
            class="vis-kpi-card__track"
            :style="{ background: paint.track }"
          >
            <span
              v-if="options.showPercent"
              class="vis-kpi-card__bar-percent"
            >
              {{ row.percentText }}
            </span>
            <div
              class="vis-kpi-card__fill"
              :style="{
                width: `${play * row.fillRatio * 100}%`,
                background: paint.fillGradient,
              }"
            >
              <span
                v-if="options.showPercent"
                class="vis-kpi-card__bar-percent is-on-fill"
              >
                {{ row.percentText }}
              </span>
            </div>
          </div>
        </div>
        <div
          v-if="options.showValue"
          class="vis-kpi-card__meta"
          :class="{ 'is-interactive': interactive }"
          :style="{ gridRow: index + 1 }"
          @click="onRowClick(row.record, $event)"
        >
          <span class="vis-kpi-card__values">
            {{ row.currentText }} / {{ row.targetText }}
          </span>
        </div>
      </template>
      <div
        v-if="view.pace"
        class="vis-kpi-card__pace-slot"
        :style="{ gridRow: `1 / span ${view.rows.length}` }"
      >
        <div
          class="vis-kpi-card__pace"
          :class="{ 'is-label-left': paceLabelOnLeft }"
          :style="{ left: `${view.pace.fillRatio * 100}%` }"
        >
          <span
            v-if="showPaceTag"
            class="vis-kpi-card__pace-tag"
          >
            时间进度：{{ view.pace.percentText }}
            <template v-if="view.pace.expired"> 已过期</template>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.vis-kpi-card {
  display: flex;
  flex-direction: column;
  gap: var(--vis-progress-gap, 10px);
  width: 100%;
  height: auto;
  min-height: 100%;
  padding: 0 8px;
  box-sizing: border-box;

  &.is-empty {
    align-items: center;
    justify-content: center;
    min-height: 72px;
    font-size: 13px;
    color: var(--vis-content-color, var(--el-text-color-placeholder));
  }
}

.vis-kpi-card__list {
  --vis-kpi-pace-head: 0px;
  --vis-kpi-pace-foot: 0px;
  display: grid;
  grid-template-columns: minmax(36px, 5.5em) minmax(0, 1fr);
  column-gap: 8px;
  row-gap: 12px;
  align-items: center;
  min-height: 0;

  &.has-meta {
    grid-template-columns: minmax(36px, 5.5em) minmax(0, 1fr) auto;
  }

  &.has-pace {
    --vis-kpi-pace-head: 18px;
    --vis-kpi-pace-foot: 12px;
    padding-top: var(--vis-kpi-pace-head);
    padding-bottom: var(--vis-kpi-pace-foot);
  }

  &.has-pace-label {
    --vis-kpi-pace-head: 36px;
  }
}

.vis-kpi-card__name {
  grid-column: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--vis-progress-label, 13px);
  line-height: 1.3;
  color: var(--vis-content-color, var(--el-text-color-regular));
}

.vis-kpi-card__plot {
  grid-column: 2;
  min-width: 0;
}

.vis-kpi-card__track {
  position: relative;
  width: 100%;
  height: var(--vis-progress-bar, 24px);
  border-radius: 3px;
  overflow: hidden;
}

.vis-kpi-card__fill {
  position: relative;
  z-index: 1;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.vis-kpi-card__bar-percent {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 8px;
  display: flex;
  align-items: center;
  font-size: var(--vis-kpi-bar-percent, 13px);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: var(--vis-content-color, #1f2329);
  pointer-events: none;

  &.is-on-fill {
    color: #fff;
  }
}

.vis-kpi-card__pace-slot {
  grid-column: 2;
  align-self: stretch;
  position: relative;
  margin-top: calc(-1 * var(--vis-kpi-pace-head));
  margin-bottom: calc(-1 * var(--vis-kpi-pace-foot));
  pointer-events: none;
  z-index: 2;
}

.vis-kpi-card__pace {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  background: repeating-linear-gradient(to bottom, var(--vis-content-color, #1f2329) 0 5px, transparent 5px 9px);
}

.vis-kpi-card__pace-tag {
  position: absolute;
  top: 0;
  left: 5px;
  padding: 1px 7px;
  border: none;
  border-radius: 10px 0 0 10px;
  background: var(--el-color-primary);
  font-size: 11px;
  line-height: 18px;
  white-space: nowrap;
  color: #fff;
}

.vis-kpi-card__pace.is-label-left .vis-kpi-card__pace-tag {
  left: auto;
  right: 5px;
  border-radius: 0 10px 10px 0;
}

.vis-kpi-card__meta {
  grid-column: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 0;
}

.vis-kpi-card__values {
  font-size: 12px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  color: var(--vis-content-color, var(--el-text-color-secondary));
}

.vis-kpi-card__name.is-interactive,
.vis-kpi-card__plot.is-interactive,
.vis-kpi-card__meta.is-interactive {
  cursor: pointer;
}
</style>
