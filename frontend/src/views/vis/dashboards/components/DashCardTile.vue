<!--
 * @Description: 看板格子：出数 + VisCardView；设计态 hover / 手柄
-->
<script setup lang="ts">
import type { DashCardGlobals } from '../dashApi'
import type { DetailHit } from '@/views/vis/shared/cardDetail'
import type { VisCard } from '@/views/vis/shared/types'
import type { VisCardDetailOpenPayload } from '@/views/vis/shared/useVisCardDetail'
import { useAccountStore } from '@/stores/modules/account'
import { FUNCTION_CARD_CONF } from '@/views/vis/cards/config'
import { resolveAutoRefreshSec, useCardAutoRefresh } from '@/views/vis/shared/cardRefresh'
import { allowsFullscreen, needsDataset } from '@/views/vis/shared/types'
import { useVisCardQuery } from '@/views/vis/shared/useVisCardQuery'
import VisCardView from '@/views/vis/shared/VisCardView.vue'
import VisFullWrap from '@/views/vis/shared/VisFullWrap.vue'
import { isVisDisabled } from '../dashApi'
import { DASH_REFRESH_TICK } from '../useDashRefresh'

const props = withDefaults(defineProps<{
  card: VisCard
  dashboardId: string
  cardId: string
  globals?: DashCardGlobals
  editable?: boolean
  designActions?: boolean
  resizing?: boolean
  allowFullscreen?: boolean
  showSql?: boolean
  /** 仅看板预览页按卡片配置自动重查；编辑页不要传 */
  autoRefresh?: boolean
  inGroup?: boolean
  canMoveToGroup?: boolean
  /** Tab 铺满组时不显示拖动手柄和缩放点 */
  locked?: boolean
  /** 父页累加，强制重查出数 */
  dataTick?: number
  hideTitle?: boolean
}>(), {
  globals: () => ({}),
  editable: false,
  designActions: false,
  resizing: false,
  allowFullscreen: false,
  showSql: false,
  autoRefresh: false,
  inGroup: false,
  canMoveToGroup: false,
  locked: false,
  dataTick: undefined,
  hideTitle: false,
})

const emit = defineEmits<{
  remove: []
  detach: []
  moveToGroup: []
  resizeStart: [corner: 'nw' | 'ne' | 'sw' | 'se', event: PointerEvent]
  openDetail: [payload: VisCardDetailOpenPayload]
}>()

const { hasFunction } = useAccountStore()
const router = useRouter()
const canEditCard = hasFunction(FUNCTION_CARD_CONF)
const disabled = computed(() => isVisDisabled(props.card.status))

const canFullscreen = computed(() =>
  !disabled.value && props.allowFullscreen && allowsFullscreen(props.card.visual.chartType),
)

const extraActions = computed(() => {
  const actions: Array<{ key: string, label: string, icon: string }> = []
  if (!props.designActions)
    return actions
  if (canEditCard) {
    actions.push({
      key: 'config',
      label: '配置',
      icon: 'i-mingcute-settings-3-line',
    })
  }
  if (props.inGroup) {
    actions.push({
      key: 'detach',
      label: '移出',
      icon: 'i-mingcute-arrow-up-line',
    })
  }
  else if (props.canMoveToGroup) {
    actions.push({
      key: 'moveToGroup',
      label: '移入分组',
      icon: 'i-mingcute-layout-grid-line',
    })
  }
  actions.push({
    key: 'remove',
    label: '删除',
    icon: 'i-mingcute-delete-2-line',
  })
  return actions
})

const datasetId = computed(() => {
  const id = String(props.card.query.datasetId || '')
  return id && id !== '0' ? id : ''
})
const { loading, error, data, pivotData, appliedQuery, run } = useVisCardQuery(() => ({
  query: props.card.query,
  visual: props.card.visual,
  dashboardId: props.dashboardId || '0',
  cardId: props.cardId || '0',
  globalFilters: props.globals?.globalFilters,
  globalParams: props.globals?.globalParams,
  showSql: props.showSql,
  enabled: !disabled.value && (needsDataset(props.card.visual.chartType) ? !!datasetId.value : true),
}))

const displayQuery = computed(() => appliedQuery.value ?? props.card.query)
const emptyText = computed(() => {
  if (disabled.value)
    return '卡片已禁用'
  return '暂无数据'
})

function onOpenDetail(hit: DetailHit) {
  const query = appliedQuery.value
  if (!query)
    return
  emit('openDetail', {
    hit,
    query,
    visual: props.card.visual,
    cardId: props.cardId,
    globals: props.globals,
  })
}

const queryFp = computed(() => JSON.stringify({
  id: props.card.id,
  status: props.card.status,
  updatedAt: props.card.updatedAt,
  datasetId: datasetId.value,
  query: props.card.query,
  visual: props.card.visual,
  globals: props.globals ?? {},
}))

const injectedTick = inject(DASH_REFRESH_TICK, ref(0))
const refreshTick = computed(() => props.dataTick ?? injectedTick.value)

watch([queryFp, refreshTick], () => {
  void run()
}, { immediate: true })

if (props.autoRefresh) {
  useCardAutoRefresh({
    intervalSec: () => resolveAutoRefreshSec(props.card.visual),
    enabled: () => !disabled.value,
    run: () => run({ silent: true }),
  })
}

function onResizePointerDown(corner: 'nw' | 'ne' | 'sw' | 'se', event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  emit('resizeStart', corner, event)
}

function onRefresh() {
  void run()
}

function onMenuAction(key: string) {
  if (key === 'config') {
    if (!props.cardId)
      return
    const href = router.resolve({
      name: 'VisCardEdit',
      query: { id: props.cardId },
    }).href
    window.open(href, '_blank')
    return
  }
  if (key === 'detach') {
    emit('detach')
    return
  }
  if (key === 'moveToGroup') {
    emit('moveToGroup')
    return
  }
  if (key === 'remove')
    emit('remove')
}
</script>

<template>
  <VisFullWrap v-slot="{ isFull, toggle }" :enabled="canFullscreen">
    <div
      class="dash-tile"
      :class="{
        'is-editable': editable,
        'is-in-group': inGroup,
        'is-locked': locked,
        'is-resizing': resizing,
        'is-full': isFull,
        'hide-resize-dots': editable && !designActions,
      }"
    >
      <template v-if="editable && !isFull && !locked">
        <div
          class="dash-tile__handle"
          title="拖动"
        >
          <span class="dash-tile__handle-icon i-mingcute-dots-vertical-line" />
        </div>
        <i class="dash-tile__dot dash-tile__dot--tl" @pointerdown="onResizePointerDown('nw', $event)" />
        <i class="dash-tile__dot dash-tile__dot--tr" @pointerdown="onResizePointerDown('ne', $event)" />
        <i class="dash-tile__dot dash-tile__dot--bl" @pointerdown="onResizePointerDown('sw', $event)" />
        <i class="dash-tile__dot dash-tile__dot--br" @pointerdown="onResizePointerDown('se', $event)" />
      </template>
      <div class="dash-tile__body">
        <VisCardView
          :key="`${card.id}:${card.updatedAt}`"
          :visual="card.visual"
          :query="displayQuery"
          :data="data"
          :pivot-data="pivotData"
          :title="card.name"
          :description="card.desc"
          :hide-title="hideTitle"
          :loading="loading"
          :error="disabled ? '' : error"
          :unavailable="disabled ? emptyText : ''"
          :empty-text="emptyText"
          :dashboard-id="dashboardId"
          :card-id="cardId"
          :global-filters="globals?.globalFilters"
          :global-params="globals?.globalParams"
          :extra-actions="extraActions"
          :allow-fullscreen="canFullscreen"
          :fullscreen="isFull"
          embedded
          @open-detail="onOpenDetail"
          @menu-action="onMenuAction"
          @refresh="onRefresh"
          @toggle-fullscreen="toggle"
        />
      </div>
    </div>
  </VisFullWrap>
</template>

<style scoped lang="scss">
@use '../dashPage.scss' as page;

.dash-tile {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  background: var(--dash-card-bg, var(--el-bg-color));
  border: 1px solid color-mix(in srgb, var(--dash-border, var(--el-border-color)) 78%, transparent);
  border-radius: var(--dash-card-radius, 12px);
  @include page.frost(card);

  &.is-in-group:not(.is-full) {
    border: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

.dash-tile__body {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: inherit;
  background: inherit;
}

.dash-tile.is-editable:not(.is-full):not(.is-locked):hover,
.dash-tile.is-editable:not(.is-full):not(.is-locked):focus-within,
.dash-tile:not(.is-full):not(.is-locked).is-resizing,
.dash-tile.is-editable:not(.is-full):not(.is-locked):has(.vis-card-view.is-menu-open) {
  outline: 3px solid var(--dash-accent, #0052d9);
  outline-offset: -1px;
}

.dash-tile.is-editable {
  .dash-tile__handle,
  .dash-tile__dot {
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease;
  }

  &:hover,
  &:focus-within,
  &.is-resizing,
  &:has(.vis-card-view.is-menu-open) {
    .dash-tile__handle,
    .dash-tile__dot {
      opacity: 1;
      pointer-events: auto;
    }
  }

  &:hover :deep(.vis-card-view__actions) {
    opacity: 1;
    pointer-events: auto;
  }
}

.dash-tile__handle {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  transform: translateX(-50%);
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.dash-tile__handle-icon {
  width: 34px;
  height: 24px;
  color: var(--dash-content-muted, #646a73);
}

.dash-tile.hide-resize-dots .dash-tile__dot {
  background: transparent;
  border-color: transparent;
}

.dash-tile__dot {
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

.dash-tile__dot--tl {
  top: var(--dash-dot-inset);
  left: var(--dash-dot-inset);
  cursor: nwse-resize;
}

.dash-tile__dot--tr {
  top: var(--dash-dot-inset);
  right: var(--dash-dot-inset);
  cursor: nesw-resize;
}

.dash-tile__dot--bl {
  bottom: var(--dash-dot-inset);
  left: var(--dash-dot-inset);
  cursor: nesw-resize;
}

.dash-tile__dot--br {
  bottom: var(--dash-dot-inset);
  right: var(--dash-dot-inset);
  cursor: nwse-resize;
}
</style>
