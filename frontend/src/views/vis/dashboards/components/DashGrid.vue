<!--
 * @Description: 看板根栅格。节点是卡片、分组或原生文本标注。
-->
<script setup lang="ts">
import type { Layout } from 'grid-layout-plus'
import type { CSSProperties } from 'vue'
import type { DashCardGlobals } from '../dashApi'
import type {
  DashGroupWidget,
  DashLayoutRect,
  DashTextAppearance,
  DashTextWidget,
  DashWidget,
} from '../dashLayout'
import type { DashPresentationMode } from '../dashPresentation'
import type { VisCard } from '@/views/vis/shared/types'
import type { VisCardDetailOpenPayload } from '@/views/vis/shared/useVisCardDetail'
import { useElementSize } from '@vueuse/core'
import { GridItem, GridLayout } from 'grid-layout-plus'
import { useVisCardDetail } from '@/views/vis/shared/useVisCardDetail'
import VisDetailDrawer from '@/views/vis/shared/VisDetailDrawer.vue'
import { DASH_COL_NUM, DASH_MARGIN, DASH_MIN_H, DASH_MIN_W, DASH_ROW_HEIGHT, DASH_STACK_MAX_WIDTH } from '../config'
import {
  applyTextDraft,
  collectCardIds,
  listGroups,
  patchWidgetRect,
  replaceGroup,
  sameRect,
  widgetKey,
  widgetMinSize,
} from '../dashLayout'
import { isDashFlowMode, projectDashFlowWidgets } from '../dashPresentation'
import { layoutMatches, stackLayout, useDashGridInteract } from '../useDashGridInteract'
import DashCardTile from './DashCardTile.vue'
import DashGroupTile from './DashGroupTile.vue'
import DashTextTile from './DashTextTile.vue'

const props = withDefaults(defineProps<{
  cards: Record<string, VisCard>
  dashboardId?: string
  editable?: boolean
  designActions?: boolean
  allowFullscreen?: boolean
  showSql?: boolean
  autoRefresh?: boolean
  dataTick?: number
  presentationMode?: DashPresentationMode
  globalsOf?: (card: VisCard) => DashCardGlobals
}>(), {
  dashboardId: '',
  editable: false,
  designActions: false,
  allowFullscreen: false,
  showSql: false,
  autoRefresh: false,
  dataTick: undefined,
  presentationMode: 'auto',
  globalsOf: () => ({}),
})

const emit = defineEmits<{
  remove: [cardId: string]
  detach: [cardId: string]
  moveToGroup: [cardId: string]
  configureGroup: [groupId: string]
  removeText: [textId: string]
}>()

const widgets = defineModel<DashWidget[]>('widgets', { default: () => [] })
const layout = ref<Layout>([])
const hostRef = ref<HTMLElement | null>(null)
const { width: hostWidth } = useElementSize(hostRef)

const flowMode = computed(() => isDashFlowMode(props.presentationMode) ? props.presentationMode : undefined)
const flowing = computed(() => !!flowMode.value)
const stacked = computed(() => props.presentationMode === 'auto'
  && !props.editable
  && hostWidth.value > 0
  && hostWidth.value < DASH_STACK_MAX_WIDTH)
const staticPresentation = computed(() => stacked.value || flowing.value)
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
  if (!props.editable || staticPresentation.value)
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
  stacked: () => staticPresentation.value,
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

const flowTiles = computed(() => {
  if (!flowMode.value)
    return []
  const visible = widgets.value.filter(widget => widget.kind !== 'card' || !!cardById.value[widget.cardId])
  return projectDashFlowWidgets(
    visible,
    flowMode.value,
    cardId => cardById.value[cardId]?.visual.chartType,
  )
})

function flowItemStyle(item: (typeof flowTiles.value)[number]): CSSProperties {
  return {
    gridColumn: `span ${item.columnSpan}`,
    ...(item.height ? { height: `${item.height}px` } : {}),
    ...(item.minHeight ? { minHeight: `${item.minHeight}px` } : {}),
  }
}

function onUpdateGroup(next: DashGroupWidget) {
  widgets.value = replaceGroup(widgets.value, next)
}

function updateTextHtml(widget: DashTextWidget, html: string) {
  widgets.value = applyTextDraft(widgets.value, widget.id, {
    html,
    appearance: widget.appearance,
  })
}

function updateTextAppearance(widget: DashTextWidget, appearance: DashTextAppearance) {
  widgets.value = applyTextDraft(widgets.value, widget.id, {
    html: widget.html,
    appearance,
  })
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
    flowing.value,
    props.presentationMode,
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
    :class="{
      'is-editable': editable,
      'is-resizing': !!interact.resizingId.value,
      'is-stacked': stacked,
      'is-flow': flowing,
    }"
  >
    <div v-if="!widgets.length" class="dash-grid__empty">
      {{ designActions ? '添加卡片、标注或分组，把内容放到看板上' : '看板上还没有内容' }}
    </div>
    <div
      v-else-if="flowMode"
      class="dash-grid__flow"
      :class="`is-${flowMode}`"
    >
      <div
        v-for="item in flowTiles"
        :key="item.key"
        class="dash-grid__flow-item"
        :data-dash-widget-key="item.key"
        :style="flowItemStyle(item)"
      >
        <DashCardTile
          v-if="item.widget.kind === 'card'"
          :card="cardById[item.widget.cardId]"
          :dashboard-id="dashboardId"
          :card-id="item.widget.cardId"
          :globals="globalsOf(cardById[item.widget.cardId])"
          :editable="editable"
          :design-actions="designActions"
          :can-move-to-group="canMoveToGroup"
          :allow-fullscreen="allowFullscreen"
          :show-sql="showSql"
          :auto-refresh="autoRefresh"
          :data-tick="dataTick"
          @remove="emit('remove', item.widget.cardId)"
          @move-to-group="emit('moveToGroup', item.widget.cardId)"
          @open-detail="onTileDetail"
        />
        <DashGroupTile
          v-else-if="item.widget.kind === 'group'"
          :widget="item.widget"
          :cards="cards"
          :dashboard-id="dashboardId"
          :editable="editable"
          :design-actions="designActions"
          :allow-fullscreen="allowFullscreen"
          :show-sql="showSql"
          :auto-refresh="autoRefresh"
          :data-tick="dataTick"
          :flow-mode="flowMode"
          :globals-of="globalsOf"
          @update:widget="onUpdateGroup"
          @configure="emit('configureGroup', item.widget.id)"
          @remove-card="emit('remove', $event)"
          @detach-card="emit('detach', $event)"
          @open-detail="onTileDetail"
        />
        <DashTextTile
          v-else
          :widget="item.widget"
          :editable="editable"
          :design-actions="designActions"
          :flow-mode="flowMode"
          @update:html="updateTextHtml(item.widget, $event)"
          @update:appearance="updateTextAppearance(item.widget, $event)"
          @remove="emit('removeText', item.widget.id)"
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
        v-for="{ item, widget } in tiles"
        :key="item.i"
        :i="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :min-w="item.minW"
        :min-h="item.minH"
        :data-dash-widget-key="String(item.i)"
        :static="!editable || stacked"
        :is-resizable="false"
        :drag-allow-from="widget.kind === 'group' ? '.dash-group__handle' : '.dash-tile__handle'"
        :drag-ignore-from="widget.kind === 'group'
          ? '.dash-group__body, .dash-group__actions, .dash-group__tab, .dash-group__cfg, .dash-group__chrome, .dash-group__dot, .dash-tile__body, .dash-tile__dot, .vis-card-view__actions, a'
          : '.vis-card-view__actions, .dash-text__actions, .dash-tile__body, .dash-tile__dot, a'"
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
          v-else-if="widget.kind === 'group'"
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
        <DashTextTile
          v-else
          :widget="widget"
          :editable="editable"
          :design-actions="designActions"
          :resizing="interact.resizingId.value === String(item.i)"
          @update:html="updateTextHtml(widget, $event)"
          @update:appearance="updateTextAppearance(widget, $event)"
          @remove="emit('removeText', widget.id)"
          @resize-start="(corner, event) => interact.onResizeStart(String(item.i), corner, event)"
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

.dash-grid__flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--dash-grid-gap, 12px);
  box-sizing: border-box;
  width: 100%;
  padding: var(--dash-grid-gap, 12px);

  &.is-medium {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    padding: 16px;
  }
}

.dash-grid__flow-item {
  min-width: 0;

  > :deep(.vis-full-wrap) {
    width: 100%;
    height: 100%;
  }

  > :deep(.dash-tile),
  > :deep(.dash-group) {
    width: 100%;
  }

  > :deep(.dash-tile:not(.dash-text)),
  > :deep(.dash-group.is-tabs) {
    height: 100%;
  }

  > :deep(.dash-text),
  > :deep(.dash-group:not(.is-tabs)) {
    height: auto;
  }

  // 流式预览里的顶层卡片补一圈很淡的边界，在浅色和深色主题下都能与画布分开。
  > :deep(.vis-full-wrap > .dash-tile:not(.is-in-group):not(.is-full)) {
    border: 1px solid color-mix(in srgb, var(--dash-border, #e5e7eb) 48%, transparent);
  }
}

@media (max-width: 359px) {
  .dash-grid__flow {
    gap: 8px;
    padding: 8px;
  }
}

:deep(.vgl-item--resizing),
:deep(.vgl-item--dragging),
:deep(.vgl-item:has(.dash-tile.is-resizing)),
:deep(.vgl-item:has(.dash-group.is-resizing)) {
  z-index: 4;
}
</style>
