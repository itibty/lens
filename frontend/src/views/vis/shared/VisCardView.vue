<!--
 * @Description: 可复用卡片壳（设计器预览 / 未来看板共用）
-->
<script setup lang="ts">
import type { DetailHit, DetailMenuPayload, PivotPathMember } from '@/views/vis/shared/cardDetail'
import type { VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { onClickOutside, useEventListener } from '@vueuse/core'
import { showToast } from '@/utils/index'
import { DASH_SURFACE_MODE_KEY } from '@/views/vis/dashboards/dashTheme'
import {
  contextFromChartDatum,
  contextFromPivotPaths,
  contextFromTableRow,
  detailMenuLabel,
  emptyDetailHit,
  resolveAllowDetail,
} from '@/views/vis/shared/cardDetail'
import {
  cardExportFileName,
  downloadCardExcel,
  exportErrorMessage,
  resolveAllowDownload,
} from '@/views/vis/shared/cardExport'
import { buildVChartSpec } from '@/views/vis/shared/cardRenderer'
import {
  resolveCardChrome,
  resolveCardRemark,
  resolveCardTitle,
} from '@/views/vis/shared/cardTheme'
import { allowsFullscreen, resolveVisStage } from '@/views/vis/shared/types'
import VChartHost from '@/views/vis/shared/VChartHost.vue'
import VisDataTable from '@/views/vis/shared/VisDataTable.vue'
import VisKpiCard from '@/views/vis/shared/VisKpiCard.vue'
import VisNumberKpi from '@/views/vis/shared/VisNumberKpi.vue'
import VisPivotTable from '@/views/vis/shared/VisPivotTable.vue'
import VisProgressCard from '@/views/vis/shared/VisProgressCard.vue'
import VisRankCard from '@/views/vis/shared/VisRankCard.vue'
import VisStaticCard from '@/views/vis/shared/VisStaticCard.vue'
import VisTrendCard from '@/views/vis/shared/VisTrendCard.vue'

export interface VisCardMenuAction {
  key: string
  label: string
  icon?: string
  danger?: boolean
  disabled?: boolean
  divided?: boolean
}

const props = withDefaults(defineProps<{
  visual: VisVisualConfig
  query: VisQueryConfig
  data: VIS.QueryDataResponse
  pivotData?: VIS.PivotQueryResponse
  /** 卡片名称；开标题且未填自定义标题时作为默认文案 */
  title?: string
  /** 卡片描述；开备注且未填功能设置备注时作为默认文案 */
  description?: string
  loading?: boolean
  emptyText?: string
  /** 查询失败时只展示文案，不画表格 / 图表 / 指标 */
  error?: string
  /** 卡片不可用（如已禁用）时只展示缺省 */
  unavailable?: string
  /** 非透视下载走后端，设计器预览用占位 id */
  dashboardId?: string
  cardId?: string
  globalFilters?: VIS.FilterItem[]
  globalParams?: VIS.FilterItem[]
  extraActions?: VisCardMenuAction[]
  /** 嵌在看板格子里：铺满单元格，不再单独缩成一张小卡 */
  embedded?: boolean
  allowFullscreen?: boolean
  fullscreen?: boolean
  hideTitle?: boolean
}>(), {
  title: '',
  description: '',
  loading: false,
  emptyText: '暂无数据',
  error: '',
  unavailable: '',
  dashboardId: '',
  cardId: '',
  globalFilters: () => [],
  globalParams: () => [],
  extraActions: () => [],
  embedded: false,
  allowFullscreen: false,
  fullscreen: false,
  hideTitle: false,
})

const emit = defineEmits<{
  openDetail: [hit: DetailHit]
  menuAction: [key: string]
  refresh: []
  toggleFullscreen: []
}>()

const emptyPivotData: VIS.PivotQueryResponse = {
  rowFields: [],
  columnFields: [],
  metrics: [],
  columns: [],
  rows: [],
  total: 0,
  truncated: false,
  columnTruncated: false,
}

const cardTitle = computed(() => props.hideTitle ? '' : resolveCardTitle(props.visual, props.title))
const cardRemark = computed(() => resolveCardRemark(props.visual, props.description))
const stageMode = computed(() => resolveVisStage(props.visual.chartType))
const isNumber = computed(() => stageMode.value === 'number')
const isProgress = computed(() => stageMode.value === 'progress')
const isKpi = computed(() => stageMode.value === 'kpi')
const isTrend = computed(() => stageMode.value === 'trend')
const isRank = computed(() => stageMode.value === 'rank')
const isTable = computed(() => stageMode.value === 'table')
const isPivot = computed(() => stageMode.value === 'pivot')
const isChart = computed(() => stageMode.value === 'chart')
const isStatic = computed(() => stageMode.value === 'static')
const stageClass = computed(() => `is-${stageMode.value}`)
const chrome = computed(() => resolveCardChrome(props.visual))
const hasCardBg = computed(() => !!chrome.value.bg)
const hasCardColor = computed(() => !!chrome.value.color)
const dashSurfaceMode = inject(DASH_SURFACE_MODE_KEY, null)
const followsDashSurface = computed(() => props.embedded && !!dashSurfaceMode && !hasCardBg.value)
const darkSurface = computed(() => followsDashSurface.value && dashSurfaceMode?.value === 'dark')

const hasHeaderText = computed(() => !!(cardTitle.value || cardRemark.value))

const empty = computed(() => {
  if (stageMode.value === 'pivot')
    return !(props.pivotData?.rows?.length)
  return !(props.data.rows?.length)
})

const bodyThemeStyle = computed(() => {
  if (!hasCardBg.value)
    return undefined
  return { background: chrome.value.bg }
})

const headerThemeStyle = computed(() => {
  if (!hasCardColor.value)
    return undefined
  return {
    color: chrome.value.color,
  }
})

const contentThemeStyle = computed(() => {
  if (hasCardColor.value) {
    return {
      'color': chrome.value.color,
      '--vis-content-color': chrome.value.color,
      '--vis-muted-color': `color-mix(in srgb, ${chrome.value.color} 64%, transparent)`,
    }
  }
  if (followsDashSurface.value) {
    return {
      'color': 'var(--dash-content-color)',
      '--vis-content-color': 'var(--dash-content-color)',
      '--vis-muted-color': 'var(--dash-content-muted)',
    }
  }
  return undefined
})

const chartSpec = computed(() =>
  buildVChartSpec(props.visual.chartType, props.query, props.data, props.visual),
)

const chartEmpty = computed(() => empty.value || !chartSpec.value)

const queryError = computed(() => props.error?.trim() || '')
const unavailableText = computed(() => props.unavailable?.trim() || '')

const truncateHint = computed(() => {
  if (queryError.value || unavailableText.value)
    return ''
  if (stageMode.value === 'pivot') {
    const rowCut = !!props.pivotData?.truncated
    const colCut = !!props.pivotData?.columnTruncated
    if (rowCut && colCut)
      return '数据量较大，仅展示部分结果与列'
    if (rowCut)
      return '数据量较大，仅展示部分结果'
    if (colCut)
      return '列数较多，仅展示部分列'
    return ''
  }
  if (props.data.truncated)
    return '数据量较大，仅展示部分结果'
  return ''
})

const allowDetail = computed(() => resolveAllowDetail(props.visual) && !queryError.value && !unavailableText.value)
const allowDownload = computed(() => resolveAllowDownload(props.visual) && !queryError.value && !unavailableText.value)
const hasMoreMenu = true
const hasMenu = computed(() => true)
const showFullscreen = computed(() =>
  props.allowFullscreen && allowsFullscreen(props.visual.chartType),
)
const showHeader = computed(() => !props.hideTitle && (hasHeaderText.value || hasMenu.value))
const exporting = ref(false)
const menuOpen = ref(false)
const canDownload = computed(() => {
  if (!allowDownload.value || props.loading || empty.value || exporting.value)
    return false
  if (isPivot.value)
    return true
  return !!(props.dashboardId && props.cardId)
})
const pivotRef = ref<{ exportExcel: (fileName: string) => Promise<void> }>()
const moreRef = ref<{ handleClose: () => void } | null>(null)
const menuRef = ref<HTMLElement>()
const menu = ref<DetailMenuPayload | null>(null)
const menuLabel = computed(() => menu.value ? detailMenuLabel(menu.value.hit) : '')

function closeMenu() {
  menu.value = null
}

function closeFloatingMenus() {
  if (menu.value)
    closeMenu()
  if (menuOpen.value)
    moreRef.value?.handleClose()
}

function openMenu(hit: DetailHit | null, clientX: number, clientY: number) {
  if (!allowDetail.value || !hit)
    return
  nextTick(() => {
    menu.value = { hit, clientX, clientY }
  })
}

function pickMenuDetail() {
  if (!menu.value)
    return
  emit('openDetail', menu.value.hit)
  closeMenu()
}

function openAllDetail() {
  closeMenu()
  emit('openDetail', emptyDetailHit())
}

function onMenuCommand(command: string | number | object) {
  const key = String(command)
  if (key === 'refresh') {
    emit('refresh')
    return
  }
  if (key === 'detail') {
    openAllDetail()
    return
  }
  if (key === 'download') {
    void onDownload()
    return
  }
  emit('menuAction', key)
}

async function onDownload() {
  if (!canDownload.value)
    return
  exporting.value = true
  try {
    const fileName = cardExportFileName(props.title)
    if (isPivot.value) {
      const run = pivotRef.value?.exportExcel
      if (!run)
        throw new Error('表格未就绪')
      if (props.pivotData?.truncated || props.pivotData?.columnTruncated)
        showToast('当前为部分结果，导出的是预览数据', 'warning')
      await run(fileName)
    }
    else {
      await downloadCardExcel({
        dashboardId: props.dashboardId,
        cardId: props.cardId,
        query: props.query,
        visual: props.visual,
        fileName,
        globalFilters: props.globalFilters,
        globalParams: props.globalParams,
      })
    }
  }
  catch (e) {
    showToast(exportErrorMessage(e, '下载失败'), 'error')
  }
  finally {
    exporting.value = false
  }
}

function onMarkClick(payload: { datum: Record<string, unknown>, clientX: number, clientY: number }) {
  openMenu(contextFromChartDatum(props.query, payload.datum), payload.clientX, payload.clientY)
}

function onTableClick(payload: { field?: string, record: Record<string, unknown>, clientX: number, clientY: number }) {
  openMenu(
    contextFromTableRow(props.query, payload.record, payload.field, props.data),
    payload.clientX,
    payload.clientY,
  )
}

function onPivotClick(payload: {
  location: 'body' | 'rowHeader' | 'columnHeader'
  rowPaths: PivotPathMember[]
  colPaths: PivotPathMember[]
  clientX: number
  clientY: number
}) {
  const rowPaths = payload.location === 'columnHeader' ? [] : payload.rowPaths
  const colPaths = payload.location === 'rowHeader' ? [] : payload.colPaths
  openMenu(contextFromPivotPaths(props.query, rowPaths, colPaths), payload.clientX, payload.clientY)
}

function onPlainDetailClick(payload: { clientX: number, clientY: number }) {
  openMenu(emptyDetailHit(), payload.clientX, payload.clientY)
}

function onKpiDetailClick(payload: { record: Record<string, unknown>, clientX: number, clientY: number }) {
  openMenu(contextFromChartDatum(props.query, payload.record), payload.clientX, payload.clientY)
}

onClickOutside(menuRef, closeMenu)
useEventListener(window, 'scroll', closeFloatingMenus, { capture: true, passive: true })
watch(allowDetail, (ok) => {
  if (!ok)
    closeMenu()
})
</script>

<template>
  <div
    class="vis-card-view h-full min-h-0 flex flex-col"
    :class="[stageClass, { 'is-menu-open': menuOpen, 'is-embedded': embedded, 'is-fullscreen': fullscreen }]"
  >
    <div
      class="vis-card-view__body"
      :class="[
        stageClass,
        {
          'is-headed': showHeader,
          'is-headless': !showHeader,
          'is-card-bg': hasCardBg,
          'is-card-color': hasCardColor,
          'is-truncated': !!truncateHint,
          'is-error': !!queryError,
          'is-unavailable': !!unavailableText,
        },
      ]"
      :style="bodyThemeStyle"
    >
      <div
        v-if="showHeader || hideTitle"
        class="vis-card-view__header"
        :class="{
          'is-card-bg': hasCardBg,
          'is-card-color': hasCardColor,
          'is-text': hasHeaderText && !hideTitle,
          'is-ghost': hideTitle,
        }"
        :style="headerThemeStyle"
      >
        <div
          v-if="!hideTitle && hasHeaderText"
          class="vis-card-view__heading"
        >
          <el-popover
            v-if="cardRemark"
            trigger="hover"
            placement="bottom-start"
            :show-after="200"
            :width="260"
            popper-class="vis-card-remark-popper"
          >
            <template #reference>
              <span
                class="vis-card-view__remark-icon i-mingcute-information-line"
                tabindex="0"
                @click.stop
                @pointerdown.stop
              />
            </template>
            {{ cardRemark }}
          </el-popover>
          <div
            v-if="cardTitle"
            class="vis-card-view__title"
          >
            {{ cardTitle }}
          </div>
        </div>
        <div
          v-if="hasMenu"
          class="vis-card-view__actions"
          :class="{ 'is-busy': exporting, 'is-open': menuOpen }"
          @pointerdown.stop
          @mousedown.stop
          @click.stop
        >
          <span
            v-if="showFullscreen"
            class="vis-card-view__full-icon"
            :class="fullscreen ? 'i-mingcute-fullscreen-exit-line' : 'i-mingcute-fullscreen-line'"
            @click="emit('toggleFullscreen')"
          />
          <el-dropdown
            v-if="hasMoreMenu"
            ref="moreRef"
            trigger="click"
            placement="bottom-end"
            popper-class="vis-card-more-popper"
            @command="onMenuCommand"
            @visible-change="menuOpen = $event"
          >
            <span class="vis-card-view__more-btn" tabindex="0">
              <span
                :class="exporting ? 'i-svg-spinners-ring-resize' : 'i-mingcute-more-2-line'"
                class="vis-card-view__more-icon"
              />
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="refresh">
                  <span class="vis-card-more-popper__icon i-mingcute-refresh-2-line" />
                  刷新
                </el-dropdown-item>
                <el-dropdown-item v-if="allowDetail" command="detail">
                  <span class="vis-card-more-popper__icon i-mingcute-list-check-3-line" />
                  明细
                </el-dropdown-item>
                <el-dropdown-item
                  v-if="allowDownload"
                  command="download"
                  :disabled="!canDownload"
                >
                  <span class="vis-card-more-popper__icon i-mingcute-download-2-line" />
                  下载
                </el-dropdown-item>
                <el-dropdown-item
                  v-for="(item, index) in extraActions"
                  :key="item.key"
                  :command="item.key"
                  :disabled="item.disabled"
                  :divided="item.divided ?? index === 0"
                  :class="{ 'is-danger': item.danger }"
                >
                  <span
                    v-if="item.icon"
                    class="vis-card-more-popper__icon"
                    :class="item.icon"
                  />
                  {{ item.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div
        class="vis-card-view__content"
        :class="{ 'is-card-color': hasCardColor }"
        :style="contentThemeStyle"
      >
        <div
          v-if="unavailableText"
          class="vis-card-view__unavailable"
        >
          <el-empty
            :description="unavailableText"
            :image-size="64"
          />
        </div>

        <div
          v-else-if="queryError"
          class="vis-card-view__error"
        >
          <div class="vis-card-view__error-title">
            查询失败
          </div>
          <div class="vis-card-view__error-detail">
            {{ queryError }}
          </div>
        </div>

        <VisNumberKpi
          v-else-if="isNumber"
          :visual="visual"
          :query="query"
          :data="data"
          :interactive="allowDetail"
          :fill="embedded"
          @detail-click="onPlainDetailClick"
        />

        <VisProgressCard
          v-else-if="isProgress"
          :visual="visual"
          :query="query"
          :data="data"
          :empty-text="emptyText"
          :interactive="allowDetail"
          :fill="embedded"
          @detail-click="onPlainDetailClick"
        />

        <VisKpiCard
          v-else-if="isKpi"
          class="vis-card-view__kpi"
          :visual="visual"
          :query="query"
          :data="data"
          :empty-text="emptyText"
          :interactive="allowDetail"
          @detail-click="onKpiDetailClick"
        />

        <VisTrendCard
          v-else-if="isTrend"
          :visual="visual"
          :query="query"
          :data="data"
          :empty-text="emptyText"
          :interactive="allowDetail"
          :fill="embedded"
          @detail-click="onKpiDetailClick"
        />

        <VisRankCard
          v-else-if="isRank"
          :visual="visual"
          :query="query"
          :data="data"
          :empty-text="emptyText"
          :interactive="allowDetail"
          @detail-click="onKpiDetailClick"
        />

        <VisDataTable
          v-else-if="isTable"
          class="vis-card-view__table"
          :visual="visual"
          :query="query"
          :data="data"
          :empty-text="emptyText"
          :interactive="allowDetail"
          :dark="darkSurface"
          @cell-click="onTableClick"
        />

        <VisPivotTable
          v-else-if="isPivot"
          ref="pivotRef"
          class="vis-card-view__pivot"
          :visual="visual"
          :query="query"
          :data="pivotData ?? emptyPivotData"
          :empty-text="emptyText"
          :interactive="allowDetail"
          :dark="darkSurface"
          @cell-click="onPivotClick"
        />

        <div
          v-else-if="isChart"
          class="vis-card-view__chart"
        >
          <VChartHost
            :spec="chartSpec"
            :empty="chartEmpty"
            :empty-text="emptyText"
            :interactive="allowDetail"
            :lock-tooltip="!!menu"
            :dark="darkSurface"
            @mark-click="onMarkClick"
          />
        </div>

        <VisStaticCard
          v-else-if="isStatic"
          class="vis-card-view__static"
          :visual="visual"
          :empty-text="emptyText"
        />

        <el-empty
          v-else
          description="未知图表类型"
          :image-size="64"
        />
      </div>
      <div
        v-if="truncateHint"
        class="vis-card-view__truncate"
        :class="{ 'is-card-color': hasCardColor }"
      >
        （{{ truncateHint }}）
      </div>

      <div
        v-show="loading"
        class="vis-card-view__loading"
        aria-hidden="true"
      >
        <span class="vis-card-view__loading-icon i-svg-spinners-ring-resize" />
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="menu"
        ref="menuRef"
        class="vis-detail-menu"
        :style="{ left: `${menu.clientX}px`, top: `${menu.clientY}px` }"
        @click.stop
      >
        <button
          type="button"
          class="vis-detail-menu__item"
          @click="pickMenuDetail"
        >
          {{ menuLabel }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.vis-card-view {
  flex: 1;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;

  &:is(.is-number, .is-progress, .is-trend) {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }

  &.is-embedded:is(.is-number, .is-progress, .is-trend) {
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
  }

  &__body {
    position: relative;
    flex: 1 1 0;
    min-height: 0;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    border: 1px solid color-mix(in srgb, var(--el-border-color) 72%, transparent);
    border-radius: var(--dash-card-radius, 12px);
    background: var(--el-bg-color);
    box-sizing: border-box;
    overflow: hidden;
    box-shadow: 0 1px 2px rgb(15 23 42 / 5%);

    &:is(.is-number, .is-progress, .is-trend) {
      flex: 0 0 auto;
      width: min(100%, 320px);
      height: auto;
      min-height: 120px;
      background: var(--el-bg-color);
    }

    &:is(.is-progress, .is-trend) {
      width: min(100%, 400px);
    }

    &:is(.is-number, .is-progress, .is-trend).is-error {
      width: min(100%, 420px);
    }
  }

  &.is-embedded &__body {
    border: none;
    box-shadow: none;
    background: transparent;
    border-radius: var(--dash-card-radius, 12px);

    &:is(.is-number, .is-progress, .is-trend) {
      flex: 1 1 0;
      width: 100%;
      height: 100%;
      min-height: 0;
      background: transparent;
    }
  }

  &.is-embedded &__header:not(.is-card-color) {
    background: var(--dash-card-header-bg, transparent);
    color: var(--dash-card-header-color, var(--el-text-color-primary));

    .vis-card-view__title {
      color: var(--dash-card-header-color, var(--el-text-color-primary));
    }

    .vis-card-view__remark-icon {
      color: var(--dash-card-header-color, var(--el-text-color-placeholder));
      opacity: 0.72;
    }
  }

  &.is-embedded &__full-icon {
    color: var(--dash-content-muted, var(--el-text-color-placeholder));

    &:hover {
      color: var(--dash-content-color, var(--el-text-color-regular));
    }
  }

  &.is-embedded &__header:not(.is-card-color) &__more-btn {
    color: var(--dash-content-muted, var(--el-text-color-secondary));

    &:hover,
    &:focus-visible {
      background: color-mix(in srgb, var(--dash-title, #1f2329) 10%, transparent);
      color: var(--dash-content-color, var(--el-text-color-primary));
    }
  }

  &__header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    width: 100%;
    max-width: 100%;
    min-height: 36px;
    padding: 10px 12px 0;
    text-align: left;
    box-sizing: border-box;

    &.is-text {
      align-items: flex-start;
      justify-content: space-between;
    }

    &.is-ghost {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 2;
      width: auto;
      min-height: 0;
      padding: 6px 8px;
    }

    :is(.is-number, .is-progress, .is-trend) & {
      padding: 12px 14px 8px;
    }
  }

  &__heading {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__actions {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 2px;
    line-height: 1;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease;

    :deep(.el-tooltip__trigger) {
      display: inline-flex;
    }
  }

  &__full-icon {
    width: 16px;
    height: 16px;
    margin-right: 6px;
    color: var(--el-text-color-placeholder);
    cursor: pointer;

    &:hover {
      color: var(--el-text-color-regular);
    }

    .is-card-color & {
      color: inherit;
      opacity: 0.45;

      &:hover {
        opacity: 0.8;
      }
    }
  }

  &__body:hover &__actions,
  &__actions.is-busy,
  &__actions.is-open {
    opacity: 1;
    pointer-events: auto;
  }

  &__more-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--vis-content-color, var(--el-text-color-secondary));
    cursor: pointer;
    outline: none;

    &:hover,
    &:focus-visible {
      background: var(--el-fill-color);
      color: var(--el-text-color-primary);
    }

    .is-card-color & {
      color: inherit;
      background: transparent;
      opacity: 0.72;

      &:hover,
      &:focus-visible {
        opacity: 1;
        background: rgb(255 255 255 / 14%);
      }
    }
  }

  &__more-icon {
    width: 16px;
    height: 16px;
  }

  &__title {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
    line-height: 1.4;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    .is-card-color & {
      color: inherit;
    }
  }

  &__remark-icon {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
    color: var(--el-text-color-placeholder);
    cursor: help;

    &:hover,
    &:focus-visible {
      color: var(--el-text-color-regular);
    }

    .is-card-color & {
      color: inherit;
      opacity: 0.7;

      &:hover,
      &:focus-visible {
        opacity: 1;
      }
    }
  }

  &__content {
    flex: 1 1 0;
    min-height: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 8px;
    box-sizing: border-box;

    :is(.is-number, .is-progress, .is-trend) & {
      flex: 1 1 auto;
      align-items: stretch;
      justify-content: center;
      padding: 6px 14px 12px;
    }

    :is(.is-number, .is-progress, .is-trend).is-headless & {
      padding: 12px 14px;
    }

    .is-embedded :is(.is-number, .is-progress, .is-trend) & {
      flex: 1 1 0;
      min-height: 0;
      padding: 8px 12px 10px;
    }

    .is-embedded :is(.is-number, .is-progress, .is-trend).is-headless & {
      padding: 10px 12px;
    }

    .is-rank &,
    .is-kpi & {
      overflow: auto;
      padding: 10px 0 12px;
    }

    .is-kpi & {
      padding: 8px 0;
    }

    .is-table &,
    .is-pivot & {
      overflow: hidden;
    }

    .is-truncated & {
      padding-bottom: 0;
    }

    .is-unknown &,
    .is-error &,
    .is-unavailable & {
      align-items: center;
      justify-content: center;
    }
  }

  &__unavailable {
    flex: 1 1 0;
    width: 100%;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 4px;
    box-sizing: border-box;

    :deep(.el-empty) {
      padding: 0;
    }

    :deep(.el-empty__description) {
      margin-top: 8px;
    }
  }

  &__error {
    flex: 1 1 0;
    width: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 4px;
    box-sizing: border-box;
    text-align: center;
    overflow: auto;

    :is(.is-number, .is-progress) & {
      flex: 1 1 auto;
      min-height: 64px;
    }
  }

  &__error-title {
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
    color: var(--el-color-warning);
  }

  &__error-detail {
    font-size: 12px;
    line-height: 1.55;
    color: var(--vis-muted-color, var(--el-text-color-secondary));
    word-break: break-word;

    :is(.is-number, .is-progress) & {
      font-size: 12px;
    }
  }

  &__kpi,
  &__chart,
  &__static {
    flex: 1 1 0;
    width: 100%;
    min-height: 200px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .is-kpi &__kpi {
    flex: 1 1 auto;
    min-height: 100%;
    height: auto;
  }

  &__table,
  &__pivot {
    flex: 1 1 0;
    width: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
  }

  &__truncate {
    flex-shrink: 0;
    padding: 0 8px 8px;
    text-align: center;
    font-size: 12px;
    line-height: 1.45;
    color: var(--vis-muted-color, var(--el-text-color-secondary));

    &.is-card-color {
      color: inherit;
      opacity: 0.7;
    }
  }

  &__loading {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: inherit;
    background: color-mix(in srgb, var(--dash-card-bg, var(--el-bg-color)) 48%, transparent);
    pointer-events: all;
  }

  &__loading-icon {
    font-size: 28px;
    color: var(--el-color-primary);
  }
}
</style>

<style lang="scss">
.vis-card-remark-popper {
  z-index: 4000 !important;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.vis-card-more-popper {
  z-index: 4000 !important;

  .el-dropdown-menu__item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .el-dropdown-menu__item.is-danger {
    color: var(--el-color-danger);
  }

  .vis-card-more-popper__icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
  }
}

.vis-detail-menu {
  position: fixed;
  z-index: 4000;
  min-width: 132px;
  padding: 4px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color-overlay);
  box-shadow: 0 8px 24px rgb(15 23 42 / 12%);
  transform: translate(4px, 4px);

  &__item {
    display: block;
    width: 100%;
    padding: 6px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--el-text-color-primary);
    font-size: 13px;
    line-height: 1.4;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: var(--el-fill-color-light);
    }
  }
}
</style>
