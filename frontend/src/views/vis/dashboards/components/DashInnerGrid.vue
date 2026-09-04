<!--
 * @Description: 分组内栅格。格子 i = cardId，坐标相对组。
-->
<script setup lang="ts">
import type { Layout } from 'grid-layout-plus'
import type { CSSProperties } from 'vue'
import type { DashCardGlobals } from '../dashApi'
import type { DashLayoutRect, DashPageItem } from '../dashLayout'
import type { DashFlowMode } from '../dashPresentation'
import type { VisCard } from '@/views/vis/shared/types'
import type { VisCardDetailOpenPayload } from '@/views/vis/shared/useVisCardDetail'
import { GridItem, GridLayout } from 'grid-layout-plus'
import { DASH_COL_NUM, DASH_MARGIN, DASH_MIN_H, DASH_MIN_W, DASH_ROW_HEIGHT } from '../config'
import { groupEmptyHint, sameRect } from '../dashLayout'
import { projectDashFlowCards } from '../dashPresentation'
import { layoutMatches, stackLayout, useDashGridInteract } from '../useDashGridInteract'
import DashCardTile from './DashCardTile.vue'

const props = withDefaults(defineProps<{
  cards: Record<string, VisCard>
  dashboardId?: string
  editable?: boolean
  designActions?: boolean
  allowFullscreen?: boolean
  showSql?: boolean
  autoRefresh?: boolean
  stacked?: boolean
  flowMode?: DashFlowMode
  emptyText?: string
  dataTick?: number
  hideTitle?: boolean
  globalsOf?: (card: VisCard) => DashCardGlobals
}>(), {
  dashboardId: '',
  editable: false,
  designActions: false,
  allowFullscreen: false,
  showSql: false,
  autoRefresh: false,
  stacked: false,
  flowMode: undefined,
  emptyText: groupEmptyHint(false),
  dataTick: undefined,
  hideTitle: false,
  globalsOf: () => ({}),
})

const emit = defineEmits<{
  remove: [cardId: string]
  detach: [cardId: string]
  openDetail: [payload: VisCardDetailOpenPayload]
}>()

const items = defineModel<DashPageItem[]>('items', { default: () => [] })
const layout = ref<Layout>([])
const visibleItems = computed(() => items.value.filter(item => props.cards[item.cardId]))
const flowing = computed(() => !!props.flowMode)
const staticPresentation = computed(() => props.stacked || flowing.value)

function toSlots(list: DashPageItem[]) {
  return list.map(item => ({
    i: item.cardId,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: DASH_MIN_W,
    minH: DASH_MIN_H,
  }))
}

function toDesignLayout(list: DashPageItem[]): Layout {
  return toSlots(list).map(item => ({
    ...item,
    static: !props.editable,
  }))
}

function applyLayout(next?: Layout) {
  if (!props.editable || staticPresentation.value)
    return
  const source = next?.length ? next : layout.value
  const byId = new Map(source.map(item => [String(item.i), item]))
  let changed = false
  const mapped = items.value.map((item) => {
    const hit = byId.get(item.cardId)
    if (!hit || sameRect(hit, item))
      return item
    changed = true
    return { ...item, x: hit.x, y: hit.y, w: hit.w, h: hit.h }
  })
  if (changed)
    items.value = mapped
}

function applyRect(id: string, rect: DashLayoutRect) {
  items.value = items.value.map(item => item.cardId === id && !sameRect(item, rect)
    ? { ...item, ...rect }
    : item)
}

const interact = useDashGridInteract({
  layout,
  editable: () => props.editable,
  stacked: () => staticPresentation.value,
  minSizeOf: () => ({ minW: DASH_MIN_W, minH: DASH_MIN_H }),
  applyRect,
  commit: applyLayout,
})

function syncLayout() {
  if (interact.busy())
    return
  const next = props.stacked
    ? stackLayout(toSlots(visibleItems.value))
    : toDesignLayout(visibleItems.value)
  if (layoutMatches(layout.value, next))
    return
  layout.value = next
}

function onLayoutModel(next: Layout) {
  if (layoutMatches(layout.value, next))
    return
  layout.value = next
}

const tiles = computed(() => layout.value.flatMap((item) => {
  const card = props.cards[String(item.i)]
  return card ? [{ item, card }] : []
}))

const flowTiles = computed(() => props.flowMode
  ? projectDashFlowCards(
      visibleItems.value,
      props.flowMode,
      cardId => props.cards[cardId]?.visual.chartType,
    )
  : [])

function flowItemStyle(item: (typeof flowTiles.value)[number]): CSSProperties {
  return {
    gridColumn: `span ${item.columnSpan}`,
    height: `${item.height}px`,
  }
}

watch(
  () => [
    props.stacked,
    props.flowMode,
    props.editable,
    visibleItems.value.map(item => `${item.cardId}:${item.x}:${item.y}:${item.w}:${item.h}`).join(','),
  ],
  syncLayout,
  { immediate: true },
)

onBeforeUnmount(() => {
  interact.cleanup()
})
</script>

<template>
  <div
    class="dash-inner"
    :class="{
      'is-editable': editable,
      'is-resizing': !!interact.resizingId.value,
      'is-stacked': stacked,
      'is-flow': flowing,
    }"
  >
    <div v-if="!visibleItems.length" class="dash-inner__empty">
      {{ emptyText }}
    </div>
    <div
      v-else-if="flowMode"
      class="dash-inner__flow"
      :class="`is-${flowMode}`"
    >
      <div
        v-for="entry in flowTiles"
        :key="entry.item.cardId"
        class="dash-inner__flow-item"
        :style="flowItemStyle(entry)"
      >
        <DashCardTile
          :card="cards[entry.item.cardId]"
          :dashboard-id="dashboardId"
          :card-id="entry.item.cardId"
          :globals="globalsOf(cards[entry.item.cardId])"
          :editable="editable"
          :design-actions="designActions"
          in-group
          :allow-fullscreen="allowFullscreen"
          :show-sql="showSql"
          :auto-refresh="autoRefresh"
          :data-tick="dataTick"
          :hide-title="hideTitle"
          @remove="emit('remove', entry.item.cardId)"
          @detach="emit('detach', entry.item.cardId)"
          @open-detail="emit('openDetail', $event)"
        />
      </div>
    </div>
    <GridLayout
      v-else
      :layout="layout"
      :col-num="DASH_COL_NUM"
      :row-height="DASH_ROW_HEIGHT"
      :margin="DASH_MARGIN"
      :is-draggable="editable && !stacked && !interact.resizingId.value"
      :is-resizable="false"
      :is-bounded="true"
      :vertical-compact="!interact.resizingId.value"
      use-css-transforms
      @update:layout="onLayoutModel"
      @layout-updated="applyLayout"
    >
      <GridItem
        v-for="{ item, card } in tiles"
        :key="item.i"
        :i="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :min-w="DASH_MIN_W"
        :min-h="DASH_MIN_H"
        :static="!editable || stacked"
        :is-resizable="false"
        drag-allow-from=".dash-tile__handle"
        drag-ignore-from=".vis-card-view__actions, .dash-tile__body, .dash-tile__dot, a"
        @moved="applyLayout"
      >
        <DashCardTile
          :card="card"
          :dashboard-id="dashboardId"
          :card-id="String(item.i)"
          :globals="globalsOf(card)"
          :editable="editable"
          :design-actions="designActions"
          in-group
          :allow-fullscreen="allowFullscreen"
          :show-sql="showSql"
          :auto-refresh="autoRefresh"
          :data-tick="dataTick"
          :hide-title="hideTitle"
          :resizing="interact.resizingId.value === String(item.i)"
          @remove="emit('remove', String(item.i))"
          @detach="emit('detach', String(item.i))"
          @resize-start="(corner, event) => interact.onResizeStart(String(item.i), corner, event)"
          @open-detail="emit('openDetail', $event)"
        />
      </GridItem>
    </GridLayout>
  </div>
</template>

<style scoped lang="scss">
@use '../dashGrid.scss' as dash;

.dash-inner {
  min-height: 120px;
  @include dash.vgl-canvas;
  @include dash.vgl-fill;

  &.is-editable,
  &.is-resizing {
    user-select: none;
  }

  &.is-resizing :deep(.dash-tile__body) {
    pointer-events: none;
  }

  &.is-editable {
    @include dash.vgl-own-tile-chrome;
  }
}

.dash-inner__empty {
  @include dash.empty-hint(120px);
  margin: var(--dash-grid-gap, 12px);
}

.dash-inner__flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--dash-grid-gap, 12px);
  box-sizing: border-box;
  width: 100%;
  padding: var(--dash-grid-gap, 12px);

  &.is-medium {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.dash-inner__flow-item {
  min-width: 0;

  > :deep(.vis-full-wrap),
  > :deep(.dash-tile) {
    width: 100%;
    height: 100%;
  }
}
</style>
