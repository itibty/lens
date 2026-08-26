<!--
 * @Description: 排行榜（前三领奖台 / 其余名次条）
-->
<script setup lang="ts">
import type { RankItemView } from '@/views/vis/shared/rankCard'
import type { VisVisualConfig } from '@/views/vis/shared/types'
import {

  rankSizeVars,
  resolveRankBarColor,
  resolveRankItems,
  resolveRankOptions,
} from '@/views/vis/shared/rankCard'

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

const opt = computed(() => resolveRankOptions(props.visual))
const items = computed(() => resolveRankItems(props.query, props.data, props.visual))
const barColor = computed(() => resolveRankBarColor(props.visual))
const cardStyle = computed(() => rankSizeVars(opt.value.size))

const podium = computed(() => {
  const byRank = new Map(items.value.filter(item => item.rank <= 3).map(item => [item.rank, item]))
  return ([
    { place: 2, col: 1, tone: 'silver', item: byRank.get(2) },
    { place: 1, col: 2, tone: 'gold', item: byRank.get(1) },
    { place: 3, col: 3, tone: 'bronze', item: byRank.get(3) },
  ] as const).filter((slot): slot is typeof slot & { item: RankItemView } => !!slot.item)
})

const listItems = computed(() => items.value.filter(item => item.rank > 3))

function onRowClick(item: { record: Record<string, unknown> }, event: MouseEvent) {
  if (!props.interactive)
    return
  emit('detailClick', {
    record: item.record,
    clientX: event.clientX,
    clientY: event.clientY,
  })
}
</script>

<template>
  <div
    v-if="items.length"
    class="vis-rank-card"
    :style="cardStyle"
  >
    <div
      v-if="podium.length"
      class="vis-rank-card__podium"
    >
      <button
        v-for="slot in podium"
        :key="slot.place"
        type="button"
        class="vis-rank-card__athlete"
        :class="[`is-${slot.tone}`, { 'is-interactive': interactive }]"
        :style="{ gridColumn: slot.col }"
        @click="onRowClick(slot.item, $event)"
      >
        <span class="vis-rank-card__medal">{{ slot.place }}</span>
        <span class="vis-rank-card__athlete-name">{{ slot.item.name }}</span>
        <span
          v-if="opt.showValue || opt.showPercent"
          class="vis-rank-card__athlete-nums"
        >
          <span v-if="opt.showValue">{{ slot.item.valueText }}</span>
          <span
            v-if="opt.showPercent"
            class="vis-rank-card__pct"
          >{{ slot.item.percentText }}</span>
        </span>
        <div
          class="vis-rank-card__stand"
          aria-hidden="true"
        />
      </button>
    </div>

    <button
      v-for="item in listItems"
      :key="`${item.rank}-${item.name}`"
      type="button"
      class="vis-rank-card__row"
      :class="{ 'is-interactive': interactive }"
      @click="onRowClick(item, $event)"
    >
      <span
        v-if="opt.showRank"
        class="vis-rank-card__no"
      >
        {{ item.rank }}
      </span>
      <div class="vis-rank-card__main">
        <div class="vis-rank-card__meta">
          <span class="vis-rank-card__name">{{ item.name }}</span>
          <span
            v-if="opt.showValue || opt.showPercent"
            class="vis-rank-card__nums"
          >
            <span v-if="opt.showValue">{{ item.valueText }}</span>
            <span
              v-if="opt.showPercent"
              class="vis-rank-card__pct"
            >{{ item.percentText }}</span>
          </span>
        </div>
        <div
          v-if="opt.showBar"
          class="vis-rank-card__track"
        >
          <i
            class="vis-rank-card__bar"
            :style="{
              width: `${item.barRatio * 100}%`,
              background: barColor,
            }"
          />
        </div>
      </div>
    </button>
  </div>
  <div
    v-else
    class="vis-rank-card is-empty"
  >
    {{ emptyText }}
  </div>
</template>

<style scoped lang="scss">
.vis-rank-card {
  display: flex;
  flex-direction: column;
  gap: var(--vis-rank-gap, 10px);
  width: 100%;
  min-width: 0;
  padding: 0 16px 0 12px;
  box-sizing: border-box;
  color: var(--vis-content-color, var(--el-text-color-primary));

  &.is-empty {
    align-items: center;
    justify-content: center;
    min-height: 80px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  &__podium {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    align-items: end;
    gap: 4px;
    padding: 8px 0 0;
  }

  &__athlete {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    text-align: center;

    &.is-interactive {
      cursor: pointer;

      &:hover .vis-rank-card__athlete-name {
        color: var(--el-color-primary);
      }
    }
  }

  &__medal {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.05em;
    height: 2.05em;
    border-radius: 50%;
    font-size: calc(var(--vis-rank-no, 14px) * 1);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 70%),
      inset 0 -2px 4px rgb(15 23 42 / 16%),
      0 2px 6px rgb(15 23 42 / 16%);

    &::after {
      content: '';
      position: absolute;
      inset: 3px;
      z-index: -1;
      border-radius: 50%;
      border: 1.5px solid rgb(255 255 255 / 55%);
      box-shadow:
        inset 0 0 0 1px rgb(15 23 42 / 10%),
        0 0 0 1px rgb(15 23 42 / 8%);
    }
  }

  &__athlete-name {
    position: relative;
    z-index: 1;
    width: 100%;
    margin-top: 6px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--vis-rank-name, 14px);
    line-height: 1.3;
  }

  &__athlete-nums {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: baseline;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 2px;
    padding-bottom: 4px;
    font-size: var(--vis-rank-value, 14px);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.3;
  }

  &__stand {
    flex: 0 0 auto;
    display: block;
    width: 100%;
    height: 16px;
    margin-top: 14px;
    border-radius: 5px 5px 0 0;
    background:
      linear-gradient(180deg, rgb(255 255 255 / 38%) 0 5px, transparent 5px),
      linear-gradient(180deg, #eef2f6 0%, #d5dbe3 46%, #c3cad4 100%);
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 70%),
      inset 0 -1px 0 rgb(15 23 42 / 6%);
  }

  .is-gold {
    .vis-rank-card__medal {
      width: 2.32em;
      height: 2.32em;
      color: #7a5208;
      font-size: calc(var(--vis-rank-no, 14px) * 1.08);
      background:
        radial-gradient(circle at 30% 26%, #fff8d2 0 20%, transparent 44%),
        linear-gradient(158deg, #ffe27a 0%, #f0c43a 36%, #c99216 68%, #e6b52e 100%);
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 75%),
        inset 0 -3px 5px rgb(140 90 8 / 28%),
        0 2px 8px rgb(201 152 24 / 38%);

      &::after {
        border-color: rgb(255 236 170 / 72%);
        box-shadow:
          inset 0 0 0 1px rgb(168 112 12 / 22%),
          0 0 0 1px rgb(176 120 16 / 18%);
      }
    }

    .vis-rank-card__athlete-name {
      font-weight: 600;
    }

    .vis-rank-card__stand {
      height: 42px;
      background:
        linear-gradient(180deg, rgb(255 255 255 / 46%) 0 6px, transparent 6px),
        linear-gradient(180deg, #f4f7fb 0%, #dce3ec 48%, #c7d0db 100%);
    }
  }

  .is-silver {
    .vis-rank-card__medal {
      width: 2.12em;
      height: 2.12em;
      color: #3d4450;
      background:
        radial-gradient(circle at 30% 26%, #fff 0 20%, transparent 44%),
        linear-gradient(158deg, #f7f8fa 0%, #c8ccd3 36%, #8f97a3 68%, #d0d4db 100%);
      box-shadow:
        inset 0 1px 0 rgb(255 255 255 / 80%),
        inset 0 -3px 5px rgb(70 78 90 / 22%),
        0 2px 8px rgb(100 110 124 / 28%);

      &::after {
        border-color: rgb(255 255 255 / 78%);
        box-shadow:
          inset 0 0 0 1px rgb(90 98 110 / 20%),
          0 0 0 1px rgb(110 118 130 / 16%);
      }
    }

    .vis-rank-card__athlete-name {
      font-weight: 600;
    }

    .vis-rank-card__stand {
      height: 26px;
    }
  }

  .is-bronze {
    .vis-rank-card__medal {
      width: 2.05em;
      height: 2.05em;
      color: #5c3414;
      background:
        radial-gradient(circle at 30% 26%, #f8e0c4 0 20%, transparent 44%),
        linear-gradient(158deg, #f0c49a 0%, #d08a4a 36%, #a85c22 68%, #d4924e 100%);
      box-shadow:
        inset 0 1px 0 rgb(255 236 214 / 70%),
        inset 0 -3px 5px rgb(120 56 12 / 28%),
        0 2px 8px rgb(179 107 46 / 32%);

      &::after {
        border-color: rgb(255 214 168 / 70%);
        box-shadow:
          inset 0 0 0 1px rgb(140 70 20 / 22%),
          0 0 0 1px rgb(160 86 28 / 16%);
      }
    }

    .vis-rank-card__athlete-name {
      font-weight: 600;
    }

    .vis-rank-card__stand {
      height: 16px;
    }
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    text-align: left;

    &.is-interactive {
      cursor: pointer;

      &:hover .vis-rank-card__name {
        color: var(--el-color-primary);
      }
    }
  }

  &__no {
    flex: 0 0 22px;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    font-size: var(--vis-rank-no, 14px);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    color: var(--el-text-color-secondary);
    text-align: right;
  }

  &__main {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__meta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  }

  &__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--vis-rank-name, 14px);
    line-height: 1.3;
  }

  &__nums {
    flex-shrink: 0;
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    font-size: var(--vis-rank-value, 14px);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.3;
  }

  &__pct {
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }

  &__track {
    width: 100%;
    height: var(--vis-rank-bar, 8px);
    border-radius: 99px;
    background: var(--el-fill-color);
    overflow: hidden;
  }

  &__bar {
    display: block;
    height: 100%;
    border-radius: inherit;
  }
}
</style>
