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
import RankMedal from '@/views/vis/shared/RankMedal.vue'

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
        <RankMedal
          class="vis-rank-card__medal"
          :rank="slot.place"
          :tone="slot.tone"
        />
        <div class="vis-rank-card__athlete-card">
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
        </div>
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
    color: var(--vis-muted-color, var(--el-text-color-secondary));
  }

  &__podium {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: end;
    gap: 4px;
    padding: 4px 0 2px;
  }

  &__athlete {
    --vis-rank-podium-tint: rgb(192 200 208 / 28%);

    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    text-align: center;
    transition: transform 0.18s ease;

    &.is-interactive {
      cursor: pointer;

      &:hover {
        transform: translateY(-3px);

        .vis-rank-card__athlete-card {
          background: linear-gradient(180deg, var(--vis-rank-podium-tint), transparent 100%);
        }
      }
    }
  }

  &__medal {
    position: relative;
    z-index: 1;
    flex: 0 0 auto;
    width: calc(var(--vis-rank-no, 14px) * 3.15);
    margin-bottom: calc(var(--vis-rank-no, 14px) * -2.35);
  }

  &__athlete-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    min-width: 0;
    padding: calc(var(--vis-rank-no, 14px) * 2.7) 6px 10px;
    box-sizing: border-box;
    border-radius: 10px;
    transition: background 0.18s ease;
  }

  &__athlete-name {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--vis-rank-name, 14px);
    line-height: 1.3;
  }

  &__athlete-nums {
    display: inline-flex;
    align-items: baseline;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 2px;
    font-size: var(--vis-rank-value, 14px);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.3;
  }

  .is-gold {
    --vis-rank-podium-tint: rgb(255 189 41 / 28%);

    .vis-rank-card__medal {
      width: calc(var(--vis-rank-no, 14px) * 3.45);
    }

    .vis-rank-card__athlete-name {
      font-weight: 600;
    }

    .vis-rank-card__athlete-card {
      padding-bottom: 20px;
    }
  }

  .is-silver {
    .vis-rank-card__athlete-name {
      font-weight: 600;
    }
  }

  .is-bronze {
    --vis-rank-podium-tint: rgb(205 127 50 / 24%);

    .vis-rank-card__athlete-name {
      font-weight: 600;
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
    color: var(--vis-muted-color, var(--el-text-color-secondary));
  }

  &__track {
    width: 100%;
    height: var(--vis-rank-bar, 8px);
    border-radius: 99px;
    background: color-mix(in srgb, var(--vis-content-color, var(--el-text-color-primary)) 12%, transparent);
    overflow: hidden;
  }

  &__bar {
    display: block;
    height: 100%;
    border-radius: inherit;
  }
}
</style>
