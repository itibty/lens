<!--
 * @Description: 看板分组：平铺栅格 / 右上角按卡片标题切换
-->
<script setup lang="ts">
import type { DashCardGlobals } from '../dashApi'
import type { DashGroupWidget, DashPageItem } from '../dashLayout'
import type { DashFlowMode } from '../dashPresentation'
import type { VisCard } from '@/views/vis/shared/types'
import type { VisCardDetailOpenPayload } from '@/views/vis/shared/useVisCardDetail'
import { createEmptyPage, groupEmptyHint } from '../dashLayout'
import DashCardTile from './DashCardTile.vue'
import DashInnerGrid from './DashInnerGrid.vue'

const props = withDefaults(defineProps<{
  widget: DashGroupWidget
  cards: Record<string, VisCard>
  dashboardId?: string
  editable?: boolean
  designActions?: boolean
  resizing?: boolean
  allowFullscreen?: boolean
  showSql?: boolean
  autoRefresh?: boolean
  stacked?: boolean
  flowMode?: DashFlowMode
  dataTick?: number
  globalsOf?: (card: VisCard) => DashCardGlobals
}>(), {
  dashboardId: '',
  editable: false,
  designActions: false,
  resizing: false,
  allowFullscreen: false,
  showSql: false,
  autoRefresh: false,
  stacked: false,
  flowMode: undefined,
  dataTick: undefined,
  globalsOf: () => ({}),
})

const emit = defineEmits<{
  'update:widget': [widget: DashGroupWidget]
  'configure': []
  'removeCard': [cardId: string]
  'detachCard': [cardId: string]
  'resizeStart': [corner: 'nw' | 'ne' | 'sw' | 'se', event: PointerEvent]
  'openDetail': [payload: VisCardDetailOpenPayload]
}>()

const tabItems = computed(() =>
  props.widget.pages.flatMap((page) => {
    const cardId = page.items[0]?.cardId
    const card = cardId ? props.cards[cardId] : undefined
    if (!cardId || !card)
      return []
    return [{
      cardId,
      title: page.title?.trim() || card.name || cardId,
    }]
  }),
)

const activeCardId = ref(tabItems.value[0]?.cardId ?? '')

watch(
  tabItems,
  (tabs) => {
    if (!tabs.some(tab => tab.cardId === activeCardId.value))
      activeCardId.value = tabs[0]?.cardId ?? ''
  },
  { immediate: true },
)

const activeCard = computed(() => props.cards[activeCardId.value])

const tileItems = computed({
  get: () => props.widget.pages[0]?.items ?? [],
  set: (items: DashPageItem[]) => {
    emit('update:widget', {
      ...props.widget,
      pages: [{ ...(props.widget.pages[0] ?? createEmptyPage()), items }],
    })
  },
})

const hideCardTitle = computed(() => props.widget.showCardTitle === false)
const emptyText = computed(() => groupEmptyHint(props.designActions))

const groupStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.widget.bg)
    style['--dash-group-bg'] = props.widget.bg
  if (props.widget.color)
    style['--dash-group-fg'] = props.widget.color
  return style
})

function onResizePointerDown(corner: 'nw' | 'ne' | 'sw' | 'se', event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  emit('resizeStart', corner, event)
}
</script>

<template>
  <div
    class="dash-group"
    :class="{
      'is-editable': editable,
      'is-resizing': resizing,
      'is-tabs': widget.mode === 'tabs',
      'is-flow': !!flowMode,
      [`is-flow-${flowMode}`]: !!flowMode,
      'has-color': !!widget.color,
      'hide-resize-dots': editable && !designActions,
    }"
    :style="groupStyle"
  >
    <template v-if="editable">
      <div
        class="dash-group__handle"
        title="拖动分组"
      >
        <span class="dash-group__handle-icon i-mingcute-dots-vertical-line" />
      </div>
      <i class="dash-group__dot dash-group__dot--tl" @pointerdown="onResizePointerDown('nw', $event)" />
      <i class="dash-group__dot dash-group__dot--tr" @pointerdown="onResizePointerDown('ne', $event)" />
      <i class="dash-group__dot dash-group__dot--bl" @pointerdown="onResizePointerDown('sw', $event)" />
      <i class="dash-group__dot dash-group__dot--br" @pointerdown="onResizePointerDown('se', $event)" />
    </template>
    <div class="dash-group__chrome">
      <div class="dash-group__titles">
        <div class="dash-group__title">
          {{ widget.title || '未命名分组' }}
        </div>
        <div v-if="widget.description" class="dash-group__desc">
          {{ widget.description }}
        </div>
      </div>
      <div class="dash-group__actions">
        <div v-if="widget.mode === 'tabs' && tabItems.length" class="dash-group__tabs">
          <button
            v-for="tab in tabItems"
            :key="tab.cardId"
            type="button"
            class="dash-group__tab"
            :class="{ 'is-active': activeCardId === tab.cardId }"
            :title="tab.title"
            @pointerdown.stop
            @click="activeCardId = tab.cardId"
          >
            {{ tab.title }}
          </button>
        </div>
        <el-button
          v-if="designActions"
          class="dash-group__cfg"
          text
          title="分组配置"
          @pointerdown.stop
          @click="emit('configure')"
        >
          <span class="i-mingcute-settings-3-line" />
        </el-button>
      </div>
    </div>
    <div class="dash-group__body" :class="{ 'is-tab': widget.mode === 'tabs' }">
      <DashCardTile
        v-if="widget.mode === 'tabs' && activeCard"
        :card="activeCard"
        :dashboard-id="dashboardId"
        :card-id="activeCardId"
        :globals="globalsOf(activeCard)"
        :editable="editable"
        :design-actions="designActions"
        in-group
        locked
        :allow-fullscreen="allowFullscreen"
        :show-sql="showSql"
        :auto-refresh="autoRefresh"
        :data-tick="dataTick"
        :hide-title="hideCardTitle"
        @remove="emit('removeCard', activeCardId)"
        @detach="emit('detachCard', activeCardId)"
        @open-detail="emit('openDetail', $event)"
      />
      <div
        v-else-if="widget.mode === 'tabs'"
        class="dash-group__empty"
      >
        {{ emptyText }}
      </div>
      <DashInnerGrid
        v-else
        v-model:items="tileItems"
        :cards="cards"
        :dashboard-id="dashboardId"
        :editable="editable"
        :design-actions="designActions"
        :allow-fullscreen="allowFullscreen"
        :show-sql="showSql"
        :auto-refresh="autoRefresh"
        :data-tick="dataTick"
        :stacked="stacked"
        :flow-mode="flowMode"
        :globals-of="globalsOf"
        :hide-title="hideCardTitle"
        :empty-text="emptyText"
        @remove="emit('removeCard', $event)"
        @detach="emit('detachCard', $event)"
        @open-detail="emit('openDetail', $event)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '../dashGrid.scss' as dash;
@use '../dashPage.scss' as page;

.dash-group {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 0;
  background: var(--dash-group-bg, var(--dash-card-bg, var(--el-bg-color)));
  border: none;
  border-radius: var(--dash-card-radius, 12px);
  @include page.frost(card);
}

.dash-group.is-editable:hover,
.dash-group.is-editable:focus-within,
.dash-group.is-resizing,
.dash-group.is-editable:has(.vis-card-view.is-menu-open) {
  outline: 3px solid color-mix(in srgb, var(--dash-accent, #0052d9) 68%, var(--dash-card-bg, #fff));
  outline-offset: -1px;
}

.dash-group.is-editable {
  .dash-group__handle,
  .dash-group__dot {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease;
  }

  &:hover,
  &:focus-within,
  &.is-resizing,
  &:has(.vis-card-view.is-menu-open) {
    .dash-group__handle,
    .dash-group__dot {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.dash-group__handle {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 26px;
  transform: translateX(-50%);
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.dash-group__handle-icon {
  width: 34px;
  height: 24px;
  color: var(--dash-content-muted, #646a73);
}

.dash-group.hide-resize-dots .dash-group__dot {
  background: transparent;
  border-color: transparent;
}

.dash-group__dot {
  --dash-dot-inset: calc(var(--dash-card-radius, 14px) * 0.16 - 8px);

  position: absolute;
  z-index: 6;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  border: 2px solid var(--dash-card-bg, #fff);
  border-radius: 50%;
  background: var(--dash-accent, #0052d9);
  touch-action: none;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    inset: -6px;
  }
}

.dash-group__dot--tl {
  top: var(--dash-dot-inset);
  left: var(--dash-dot-inset);
  cursor: nwse-resize;
}

.dash-group__dot--tr {
  top: var(--dash-dot-inset);
  right: var(--dash-dot-inset);
  cursor: nesw-resize;
}

.dash-group__dot--bl {
  bottom: var(--dash-dot-inset);
  left: var(--dash-dot-inset);
  cursor: nesw-resize;
}

.dash-group__dot--br {
  bottom: var(--dash-dot-inset);
  right: var(--dash-dot-inset);
  cursor: nwse-resize;
}

.dash-group__chrome {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  min-width: 0;
  padding: 6px var(--dash-grid-gap, 12px) 0;
}

.dash-group__titles {
  flex: 0 1 auto;
  max-width: calc(100% - 40px);
  min-width: 72px;
}

.dash-group.is-tabs {
  .dash-group__titles {
    flex: 1 1 0;
    max-width: 50%;
    min-width: 64px;
  }

  .dash-group__actions {
    flex: 1 1 0;
    max-width: 50%;
  }
}

.dash-group.is-tabs.is-editable {
  .dash-group__titles,
  .dash-group__actions {
    max-width: calc(50% - 28px);
  }
}

.dash-group__title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 28px;
  color: var(--dash-group-fg, var(--dash-title, var(--el-text-color-primary)));
}

.dash-group__desc {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  white-space: pre-wrap;
  font-size: 12px;
  line-height: 20px;
  color: var(--dash-group-fg, var(--dash-content-muted, var(--el-text-color-secondary)));
}

.dash-group__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.dash-group__tabs {
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  padding: 2px;
  overflow-x: auto;
  border-radius: 8px;
  background: color-mix(in srgb, var(--dash-title, #1f2329) 8%, var(--dash-card-bg, #fff));
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.dash-group.has-color {
  .dash-group__tabs {
    background: rgb(255 255 255 / 14%);
  }

  .dash-group__tab {
    color: var(--dash-group-fg);
    opacity: 0.68;

    &:hover:not(.is-active) {
      opacity: 0.88;
    }

    &.is-active {
      opacity: 1;
      background: rgb(255 255 255 / 24%);
      box-shadow: none;
    }
  }
}

.dash-group__tab {
  flex-shrink: 0;
  max-width: 120px;
  height: 24px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--dash-content-muted, var(--el-text-color-secondary));
  font-size: 12px;
  line-height: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;

  &:hover:not(.is-active) {
    color: var(--dash-content-color, var(--el-text-color-primary));
  }

  &.is-active {
    background: var(--dash-card-bg, var(--el-bg-color));
    color: var(--dash-accent, var(--el-color-primary));
    font-weight: 600;
    box-shadow: 0 1px 2px rgb(15 23 42 / 8%);
  }
}

.dash-group__cfg {
  flex-shrink: 0;
  padding: 4px;

  .i-mingcute-settings-3-line {
    width: 16px;
    height: 16px;
  }
}

.dash-group__body {
  flex: 1;
  min-height: 0;
  overflow: auto;

  &.is-tab {
    overflow: hidden;
    padding: var(--dash-grid-gap, 12px);
  }
}

.dash-group__empty {
  @include dash.empty-hint(120px);
}

.dash-group.is-flow {
  background: var(
    --dash-group-bg,
    color-mix(in srgb, var(--dash-card-bg, var(--el-bg-color)) 94%, var(--dash-canvas-bg, transparent))
  );
  border: 1px solid color-mix(in srgb, var(--dash-border, #e5e7eb) 64%, transparent);

  .dash-group__chrome {
    min-height: 52px;
    padding: 10px 14px 9px;
    border-bottom: 1px solid color-mix(in srgb, var(--dash-group-fg, var(--dash-border, #e5e7eb)) 18%, transparent);
  }

  .dash-group__title {
    font-size: 14px;
    line-height: 22px;
  }

  .dash-group__desc {
    margin-top: 1px;
    line-height: 18px;
  }

  .dash-group__tabs {
    gap: 2px;
    border: 1px solid color-mix(in srgb, var(--dash-border, #e5e7eb) 42%, transparent);
  }

  &:not(.has-color) .dash-group__tab.is-active {
    background: color-mix(
      in srgb,
      var(--dash-card-bg, var(--el-bg-color)) 90%,
      var(--dash-accent, var(--el-color-primary))
    );
    box-shadow: none;
  }

  // 组内卡片比外层容器更亮一层，用边界而非重阴影表达嵌套关系。
  :deep(.dash-tile.is-in-group:not(.is-full)) {
    border: 1px solid color-mix(in srgb, var(--dash-border, #e5e7eb) 46%, transparent);
    background: var(--dash-card-bg, var(--el-bg-color));
    box-shadow: 0 1px 2px color-mix(in srgb, var(--dash-title, #1f2329) 6%, transparent);
  }
}

.dash-group.is-flow:not(.is-tabs) {
  height: auto;
  min-height: 160px;

  .dash-group__body {
    flex: none;
    overflow: visible;
  }
}

.dash-group.is-flow.is-tabs {
  min-height: 0;

  .dash-group__body.is-tab {
    min-height: 0;
  }

  .dash-group__tab {
    height: 44px;
    line-height: 44px;
  }
}

.dash-group.is-flow-compact.is-tabs {
  .dash-group__chrome {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 11px 12px 10px;
  }

  .dash-group__titles,
  .dash-group__actions {
    width: 100%;
    max-width: 100%;
  }

  .dash-group__actions {
    justify-content: flex-start;
  }

  .dash-group__title {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    white-space: normal;
  }

  .dash-group__tabs {
    width: 100%;
    box-sizing: border-box;
    scroll-snap-type: x proximity;
  }

  .dash-group__tab {
    max-width: min(156px, 68vw);
    scroll-snap-align: start;
  }
}

@media (max-width: 359px) {
  .dash-group.is-flow {
    .dash-group__chrome {
      padding-right: 10px;
      padding-left: 10px;
    }

    .dash-group__body.is-tab {
      padding: 8px;
    }
  }
}
</style>
