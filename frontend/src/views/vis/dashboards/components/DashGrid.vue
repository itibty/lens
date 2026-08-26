<!--
 * @Description: 看板根栅格。节点是卡片或分组。
-->
<script setup lang="ts">
import type { Layout } from 'grid-layout-plus'
import type { DashCardGlobals } from '../dashApi'
import type { DashGroupWidget, DashLayoutRect, DashWidget } from '../dashLayout'
import type { VisCard } from '@/views/vis/shared/types'
import type { VisCardDetailOpenPayload } from '@/views/vis/shared/useVisCardDetail'
import { useElementSize } from '@vueuse/core'
import { GridItem, GridLayout } from 'grid-layout-plus'
import { useVisCardDetail } from '@/views/vis/shared/useVisCardDetail'
import VisDetailDrawer from '@/views/vis/shared/VisDetailDrawer.vue'
import { DASH_COL_NUM, DASH_MARGIN, DASH_MIN_H, DASH_MIN_W, DASH_ROW_HEIGHT, DASH_STACK_MAX_WIDTH } from '../config'
import {
  collectCardIds,
  listGroups,
  patchWidgetRect,
  replaceGroup,
  sameRect,
  widgetKey,
  widgetMinSize,
} from '../dashLayout'
import { layoutMatches, stackLayout, useDashGridInteract } from '../useDashGridInteract'
import DashCardTile from './DashCardTile.vue'
import DashGroupTile from './DashGroupTile.vue'

const props = withDefaults(defineProps<{
  cards: Record<string, VisCard>
  dashboardId?: string
  editable?: boolean
  designActions?: boolean
  allowFullscreen?: boolean
  showSql?: boolean
  autoRefresh?: boolean
  dataTick?: number
  globalsOf?: (card: VisCard) => DashCardGlobals
}>(), {
  dashboardId: '',
  editable: false,
  designActions: false,
  allowFullscreen: false,
  showSql: false,
  autoRefresh: false,
  dataTick: undefined,
  globalsOf: () => ({}),
})

const emit = defineEmits<{
  remove: [cardId: string]
  detach: [cardId: string]
  moveToGroup: [cardId: string]
  configureGroup: [groupId: string]
}>()

const widgets = defineModel<DashWidget[]>('widgets', { default: () => [] })
const layout = ref<Layout>([])
const hostRef = ref<HTMLElement | null>(null)
const { width: hostWidth } = useElementSize(hostRef)

const stacked = computed(() => !props.editable && hostWidth.value > 0 && hostWidth.value < DASH_STACK_MAX_WIDTH)
const canMoveToGroup = computed(() => props.designActions && listGroups(widgets.value).length > 0)
const cardById = computed(() => props.cards)

function toSlots(list: DashWidget[]) {
  return list.map((widget) => {
    const min = widgetMinSize(widget)
    return {
      i: widgetKey(widget),
      x: widget.x,
      y: widget.y,
      w: widget.w,
      h: widget.h,
      minW: min.minW,
      minH: min.minH,
    }
  })
}

function toDesignLayout(list: DashWidget[]): Layout {
  return toSlots(list).map(item => ({
    ...item,
    static: !props.editable,
  }))
}

function applyLayout(next?: Layout) {
  if (!props.editable || stacked.value)
    return
  const source = next?.length ? next : layout.value
  const byId = new Map(source.map(item => [String(item.i), item]))
  let changed = false
  const mapped = widgets.value.map((widget) => {
    const hit = byId.get(widgetKey(widget))
    if (!hit || sameRect(hit, widget))
      return widget
    changed = true
    return { ...widget, x: hit.x, y: hit.y, w: hit.w, h: hit.h }
  })
  if (changed)
    widgets.value = mapped
}

function applyRect(id: string, rect: DashLayoutRect) {
  widgets.value = patchWidgetRect(widgets.value, id, rect)
}

const interact = useDashGridInteract({
  layout,
  editable: () => props.editable,
  stacked: () => stacked.value,
  minSizeOf: (id) => {
    const widget = widgets.value.find(item => widgetKey(item) === id)
    return widget ? widgetMinSize(widget) : { minW: DASH_MIN_W, minH: DASH_MIN_H }
  },
  applyRect,
  commit: applyLayout,
})

function syncLayoutFromWidgets() {
  if (interact.busy())
    return
  const next = stacked.value
    ? stackLayout(toSlots(widgets.value))
    : toDesignLayout(widgets.value)
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
  const widget = widgets.value.find(entry => widgetKey(entry) === String(item.i))
  if (!widget)
    return []
  if (widget.kind === 'card' && !cardById.value[widget.cardId])
    return []
  return [{ item, widget }]
}))

function onUpdateGroup(next: DashGroupWidget) {
  widgets.value = replaceGroup(widgets.value, next)
}

const detailScope = ref<Omit<VisCardDetailOpenPayload, 'hit'> | null>(null)
const {
  open: detailOpen,
  loading: detailLoading,
  error: detailError,
  title: detailTitle,
  tags: detailTags,
  data: detailData,
  openDetail,
  closeDetail,
} = useVisCardDetail(() => ({
  query: detailScope.value?.query,
  visual: detailScope.value?.visual,
  dashboardId: props.dashboardId,
  cardId: detailScope.value?.cardId,
  globals: detailScope.value?.globals,
  showSql: props.showSql,
}))

function onTileDetail(payload: VisCardDetailOpenPayload) {
  detailScope.value = payload
  void openDetail(payload.hit)
}

watch(
  () => [
    stacked.value,
    props.editable,
    widgets.value.map(item => `${widgetKey(item)}:${item.x}:${item.y}:${item.w}:${item.h}`).join(','),
  ],
  syncLayoutFromWidgets,
  { immediate: true },
)

watch(
  () => collectCardIds(widgets.value),
  (ids) => {
    if (detailScope.value && !ids.includes(detailScope.value.cardId))
      closeDetail()
  },
)

onBeforeUnmount(() => {
  interact.cleanup()
})
</script>

<template>
  <div
    ref="hostRef"
    class="dash-grid"
    :class="{ 'is-editable': editable, 'is-resizing': !!interact.resizingId.value, 'is-stacked': stacked }"
  >
    <div v-if="!widgets.length" class="dash-grid__empty">
      {{ designActions ? '点击「卡片」或「分组」把内容放到看板上' : '看板上还没有卡片' }}
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
        v-for="{ item, widget } in tiles"
        :key="item.i"
        :i="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :min-w="item.minW"
        :min-h="item.minH"
        :static="!editable || stacked"
        :is-resizable="false"
        :drag-allow-from="widget.kind === 'group' ? '.dash-group__handle' : '.dash-tile__handle'"
        :drag-ignore-from="widget.kind === 'group'
          ? '.dash-group__body, .dash-group__actions, .dash-group__tab, .dash-group__cfg, .dash-group__chrome, .dash-group__dot, .dash-tile__body, .dash-tile__dot, .vis-card-view__actions, a'
          : '.vis-card-view__actions, .dash-tile__body, .dash-tile__dot, a'"
        @moved="applyLayout"
      >
        <DashCardTile
          v-if="widget.kind === 'card'"
          :card="cardById[widget.cardId]"
          :dashboard-id="dashboardId"
          :card-id="widget.cardId"
          :globals="globalsOf(cardById[widget.cardId])"
          :editable="editable"
          :design-actions="designActions"
          :can-move-to-group="canMoveToGroup"
          :allow-fullscreen="allowFullscreen"
          :show-sql="showSql"
          :auto-refresh="autoRefresh"
          :data-tick="dataTick"
          :resizing="interact.resizingId.value === String(item.i)"
          @remove="emit('remove', widget.cardId)"
          @move-to-group="emit('moveToGroup', widget.cardId)"
          @resize-start="(corner, event) => interact.onResizeStart(String(item.i), corner, event)"
          @open-detail="onTileDetail"
        />
        <DashGroupTile
          v-else
          :widget="widget"
          :cards="cards"
          :dashboard-id="dashboardId"
          :editable="editable"
          :design-actions="designActions"
          :allow-fullscreen="allowFullscreen"
          :show-sql="showSql"
          :auto-refresh="autoRefresh"
          :data-tick="dataTick"
          :stacked="stacked"
          :globals-of="globalsOf"
          :resizing="interact.resizingId.value === String(item.i)"
          @update:widget="onUpdateGroup"
          @configure="emit('configureGroup', widget.id)"
          @remove-card="emit('remove', $event)"
          @detach-card="emit('detach', $event)"
          @resize-start="(corner, event) => interact.onResizeStart(String(item.i), corner, event)"
          @open-detail="onTileDetail"
        />
      </GridItem>
    </GridLayout>
    <VisDetailDrawer
      v-model:open="detailOpen"
      :title="detailTitle"
      :tags="detailTags"
      :loading="detailLoading"
      :error="detailError"
      :data="detailData"
    />
  </div>
</template>

<style scoped lang="scss">
@use '../dashGrid.scss' as dash;

.dash-grid {
  min-height: 240px;
  @include dash.vgl-canvas;
  @include dash.vgl-fill(true);

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

  &:not(.is-editable) {
    :deep(.vgl-item:has(.vis-card-view.is-menu-open)) {
      z-index: 4;
    }
  }

  &.is-editable :deep(.vgl-item:hover > .dash-tile .vis-card-view__actions),
  &.is-editable :deep(.vgl-item:hover > .vis-full-wrap > .dash-tile .vis-card-view__actions) {
    opacity: 1;
    pointer-events: auto;
  }
}

.dash-grid__empty {
  @include dash.empty-hint(240px);
}

:deep(.vgl-item--resizing),
:deep(.vgl-item--dragging),
:deep(.vgl-item:has(.dash-tile.is-resizing)),
:deep(.vgl-item:has(.dash-group.is-resizing)) {
  z-index: 4;
}
</style>
