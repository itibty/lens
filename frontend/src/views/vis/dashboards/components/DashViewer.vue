<!--
 * @Description: 看板查看（全屏预览 / 报表中心共用）。id 优先取 path 参数，其次 query。
-->
<script setup lang="ts">
import type { DashFilterValues, VisDashFilterDef } from '../dashApi'
import type { DashWidget } from '../dashLayout'
import type { DashCardRadiusId, DashThemeId } from '../dashTheme'
import type { VisCard } from '@/views/vis/shared/types'
import { useElementSize } from '@vueuse/core'
import vis from '@/apis/vis/index'
import { UIConfig } from '@/core/config'
import { LENS_THEME_KEY } from '@/theme/context'
import { showToast } from '@/utils/index'
import { useCardAutoRefresh } from '@/views/vis/shared/cardRefresh'
import { apiErrorMessage } from '@/views/vis/shared/visRequest'
import { DASH_VIEWER_ID } from '../config'
import {
  globalsForCard,
  isVisDisabled,
  loadDashboardWidgets,
} from '../dashApi'
import { useDashFilterUrl } from '../dashFilterQuery'
import {
  DASH_EAGER_CARD_QUERIES_KEY,
  DASH_LAZY_CARD_QUERIES_KEY,
  DASH_PRESENTATION_MODE_KEY,
  resolveDashPresentationMode,
} from '../dashPresentation'
import { createDashQueryStatus, DASH_QUERY_STATUS_KEY } from '../dashQueryStatus'
import { createDashCardQueryTracker, DASH_CARD_QUERY_TRACKER_KEY } from '../dashQueryTracker'
import { captureDashPreview, saveDashScreenshot } from '../dashScreenshot'
import {
  dashOverlayVars,
  dashThemeVars,
  DEFAULT_DASH_CARD_RADIUS,
  DEFAULT_DASH_THEME,
  isDashGlassTheme,
  resolveDashTheme,
} from '../dashTheme'
import { assertSubscriptionScreenshotReady } from '../subscriptionScreenshot'
import { useDashboardViewState } from '../useDashboardViewState'
import { useDashChromeScroll } from '../useDashChromeScroll'
import { useDashRefresh } from '../useDashRefresh'
import DashboardSubscriptionDrawer from './DashboardSubscriptionDrawer.vue'
import DashFilterBar from './DashFilterBar.vue'
import DashGrid from './DashGrid.vue'
import DashSnapshotMeta from './DashSnapshotMeta.vue'
import PersonalViewToolbar from './PersonalViewToolbar.vue'

defineOptions({ name: 'DashViewer' })

const props = withDefaults(defineProps<{
  /** 独立预览页按容器宽度切换 wide / medium / compact；报表中心保留原 auto 行为。 */
  standalone?: boolean
}>(), {
  standalone: false,
})

const route = useRoute()
const router = useRouter()
const viewerRef = ref<HTMLElement | null>(null)
const initialViewerWidth = typeof window === 'undefined' ? 1024 : window.innerWidth
const { width: viewerWidth } = useElementSize(viewerRef, { width: initialViewerWidth, height: 0 })
const presentationMode = computed(() => resolveDashPresentationMode(viewerWidth.value, props.standalone))
provide(DASH_PRESENTATION_MODE_KEY, presentationMode)
provide(DASH_LAZY_CARD_QUERIES_KEY, true)
const eagerCardQueries = ref(false)
provide(DASH_EAGER_CARD_QUERIES_KEY, readonly(eagerCardQueries))
const queryStatus = createDashQueryStatus()
provide(DASH_QUERY_STATUS_KEY, queryStatus)
const cardQueryTracker = createDashCardQueryTracker()
provide(DASH_CARD_QUERY_TRACKER_KEY, cardQueryTracker)
const loading = ref(false)
const name = ref('看板')
const desc = ref('')
const dashboardId = ref('')
const dashDisabled = ref(false)
const emptyText = ref('')
const widgets = ref<DashWidget[]>([])
const cardMap = ref<Record<string, VisCard>>({})
const filters = ref<VisDashFilterDef[]>([])
const filterValues = ref<DashFilterValues>({})
const theme = ref<DashThemeId>(DEFAULT_DASH_THEME)
const cardRadius = ref<DashCardRadiusId>(DEFAULT_DASH_CARD_RADIUS)
const autoRefreshSec = ref<number>()
const themeStyle = computed(() => dashThemeVars(theme.value, cardRadius.value))
const glassTheme = computed(() => isDashGlassTheme(theme.value))
provide(LENS_THEME_KEY, computed(() => resolveDashTheme(theme.value).theme))
const { refreshCards, refreshTick } = useDashRefresh()
const { chromeHidden, onCanvasScroll, revealChrome } = useDashChromeScroll()
const personal = reactive(useDashboardViewState(filters, filterValues))
const { pauseFilterUrl, resumeFilterUrl } = useDashFilterUrl(
  filters,
  filterValues,
  () => !dashDisabled.value && !emptyText.value,
)
const capturing = ref(false)
const generatedAt = ref('')
const refreshing = computed(() => Object.values(queryStatus.cards.value).some(card => card.loading))
const refreshFailed = computed(() => Object.values(queryStatus.cards.value).filter(card => card.error).length)
watch(() => personal.ready, (ready) => {
  if (ready)
    resumeFilterUrl()
})
const screenshotStatus = ref('idle')
const screenshotError = ref('')
const subscriptionDrawerRef = ref<InstanceType<typeof DashboardSubscriptionDrawer>>()

function openSubscription() {
  if (dashboardId.value && !dashDisabled.value)
    subscriptionDrawerRef.value?.open()
}

async function waitForCardQueries(timeoutMs = 15_000) {
  await nextTick()
  await nextTick()
  await cardQueryTracker.waitForIdle(timeoutMs)
  await nextTick()
}

async function shareCurrentView() {
  try {
    await nextTick()
    await navigator.clipboard.writeText(window.location.href)
    showToast('已复制当前筛选链接')
  }
  catch { showToast('复制失败，请复制浏览器地址栏链接', 'error') }
}

function openPreview() {
  if (!dashboardId.value)
    return
  const href = router.resolve({
    name: 'VisDashboardView',
    query: { ...Object.fromEntries(new URL(window.location.href).searchParams), id: dashboardId.value },
  }).href
  window.open(href, '_blank')
}

useCardAutoRefresh({
  intervalSec: () => autoRefreshSec.value,
  enabled: () => !capturing.value && !loading.value && !dashDisabled.value && !emptyText.value,
  run: () => refreshCards(),
})

function routeDashboardId() {
  const fromParam = route.params.id
  const fromQuery = route.query.id
  const raw = Array.isArray(fromParam) ? fromParam[0] : fromParam
  const fallback = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery
  return String(raw || fallback || '')
}

function globalsOf(card: VisCard) {
  return globalsForCard(filters.value, filterValues.value, card.query.datasetId)
}

function applyPageTitle() {
  const title = name.value.trim() || '看板预览'
  document.title = `${title}-${UIConfig.appTitle}`
}

function resetViewer() {
  dashboardId.value = ''
  name.value = '看板'
  desc.value = ''
  dashDisabled.value = false
  widgets.value = []
  cardMap.value = {}
  filters.value = []
  filterValues.value = {}
  theme.value = DEFAULT_DASH_THEME
  cardRadius.value = DEFAULT_DASH_CARD_RADIUS
  autoRefreshSec.value = undefined
}

let loadRequestId = 0
async function loadDashboard(id: string) {
  const currentRequestId = ++loadRequestId
  if (!id) {
    pauseFilterUrl()
    resetViewer()
    emptyText.value = '请从左侧选择报表'
    loading.value = false
    return
  }
  emptyText.value = ''
  loading.value = true
  personal.ready = false
  queryStatus.cards.value = {}
  pauseFilterUrl()
  try {
    const res = await vis.query.getDashboardDetail({ dashboardId: id })
    if (currentRequestId !== loadRequestId)
      return
    if (!res.data) {
      resetViewer()
      emptyText.value = res.msg || '看板不存在'
      return
    }
    const disabled = isVisDisabled(res.data.status)
    const loaded = disabled ? undefined : await loadDashboardWidgets(res.data)
    if (currentRequestId !== loadRequestId)
      return
    dashboardId.value = String(res.data.id || id)
    name.value = res.data.dashName || '看板'
    desc.value = res.data.dashDesc || ''
    dashDisabled.value = disabled
    if (dashDisabled.value) {
      filters.value = []
      widgets.value = []
      cardMap.value = {}
      theme.value = DEFAULT_DASH_THEME
      cardRadius.value = DEFAULT_DASH_CARD_RADIUS
      autoRefreshSec.value = undefined
    }
    else if (loaded) {
      filters.value = loaded.filters
      widgets.value = loaded.widgets
      cardMap.value = loaded.cardMap
      theme.value = loaded.theme
      cardRadius.value = loaded.cardRadius
      autoRefreshSec.value = loaded.autoRefreshSec
    }
    if (!dashDisabled.value) {
      await personal.load(dashboardId.value, { ...route.query })
      if (currentRequestId !== loadRequestId)
        return
      if (personal.ready)
        resumeFilterUrl()
    }
    applyPageTitle()
  }
  catch (e) {
    if (currentRequestId !== loadRequestId)
      return
    resetViewer()
    emptyText.value = apiErrorMessage(e, '看板不存在')
  }
  finally {
    if (currentRequestId === loadRequestId)
      loading.value = false
  }
}

async function onScreenshot() {
  if (capturing.value || loading.value)
    return
  const root = document.getElementById(DASH_VIEWER_ID)
  if (!root) {
    showToast('截屏失败', 'error')
    return
  }
  capturing.value = true
  generatedAt.value = ''
  screenshotStatus.value = 'running'
  screenshotError.value = ''
  eagerCardQueries.value = true
  revealChrome()
  try {
    refreshCards()
    await waitForCardQueries()
    if (!personal.ready)
      throw new Error(personal.error || '查看状态尚未准备完成')
    if (route.query.subscriptionScreenshot === '1') {
      if (emptyText.value || dashDisabled.value)
        throw new Error(emptyText.value || '看板已禁用')
      assertSubscriptionScreenshotReady(root)
    }
    generatedAt.value = new Date().toISOString()
    await nextTick()
    const blob = await captureDashPreview(root)
    saveDashScreenshot(blob, name.value)
    screenshotStatus.value = 'success'
    showToast('截屏已保存')
  }
  catch (error) {
    screenshotStatus.value = 'failed'
    screenshotError.value = error instanceof Error ? error.message : '截屏失败'
    showToast(screenshotError.value, 'error')
  }
  finally {
    eagerCardQueries.value = false
    capturing.value = false
  }
}

watch(
  () => [routeDashboardId(), route.query.f, route.query.viewId, route.query.subscriptionRunId],
  () => {
    void loadDashboard(routeDashboardId())
  },
  { immediate: true },
)
</script>

<template>
  <div
    :id="DASH_VIEWER_ID"
    ref="viewerRef"
    v-spinner="loading"
    :data-dashboard-view-state="personal.ready ? 'ready' : personal.error ? 'failed' : 'loading'"
    :data-dashboard-view-error="personal.error"
    :data-dashboard-screenshot-status="screenshotStatus"
    :data-dashboard-screenshot-error="screenshotError"
    class="viewer"
    :class="`is-${presentationMode}`"
    :style="themeStyle"
    :data-dash-glass="glassTheme ? 'true' : undefined"
  >
    <el-scrollbar
      class="viewer__canvas"
      @scroll="onCanvasScroll"
    >
      <div
        v-if="!emptyText"
        class="viewer__chrome"
        :class="{ 'is-off': chromeHidden }"
      >
        <DashFilterBar
          v-model:values="filterValues"
          v-model:theme="theme"
          :title="name"
          :desc="desc"
          :defs="dashDisabled || personal.runDate ? [] : filters"
          :filter-options-dashboard-id="dashboardId"
          :presentation-mode="presentationMode"
          :preview-disabled="!dashboardId"
          :show-preview="!standalone"
          :show-subscription="!!dashboardId && !dashDisabled && personal.ready"
          :show-favorite="personal.ready && !personal.runDate && !capturing"
          :favorite="!!personal.preference.favorite"
          :favorite-busy="personal.busy"
          :loading="loading"
          :refreshing="refreshing"
          :refresh-failed="refreshFailed"
          :screenshotting="capturing"
          @refresh="refreshCards"
          @screenshot="onScreenshot"
          @subscription="openSubscription"
          @favorite="personal.favorite"
          @preview="openPreview"
        >
          <template v-if="personal.ready && !personal.runDate && !capturing" #personal>
            <PersonalViewToolbar
              :views="personal.views" :selected-id="personal.selectedId" :linked="personal.linked"
              :default-view-id="personal.preference.defaultViewId" :surface-style="dashOverlayVars(theme)"
              :dirty="personal.dirty" :busy="personal.busy"
              @choose="personal.choose" @save="personal.save"
              @rename="personal.rename" @remove="personal.remove" @set-default="personal.setDefault" @share="shareCurrentView"
            />
          </template>
        </DashFilterBar>
        <div v-if="personal.error" class="viewer__state-error">
          <el-alert :title="personal.error" type="warning" :closable="false" />
          <el-button v-if="route.query.subscriptionScreenshot !== '1'" :loading="personal.busy" @click="personal.choose('')">
            恢复默认视图
          </el-button>
        </div>
        <div v-if="personal.runDate" class="viewer__run-info">
          <el-tooltip content="使用本次订阅的筛选和日期重新查询当前数据" :disabled="capturing">
            <span class="viewer__run-label">订阅视图</span>
          </el-tooltip>
          <span>{{ personal.summary }}</span>
          <span>计算日期 {{ personal.runDate }}</span>
          <el-button v-if="!capturing && route.query.subscriptionScreenshot !== '1'" text @click="personal.choose('')">
            退出订阅视图
          </el-button>
        </div>
        <DashSnapshotMeta v-if="capturing" :cards="queryStatus.cards.value" :generated-at="generatedAt" />
      </div>
      <div class="viewer__body">
        <div
          v-if="(emptyText || dashDisabled) && !loading"
          class="viewer__unavailable"
        >
          <el-empty
            :description="emptyText || '看板已禁用'"
            :image-size="120"
          />
        </div>
        <DashGrid
          v-else-if="personal.ready && !loading"
          v-model:widgets="widgets"
          :cards="cardMap"
          :dashboard-id="dashboardId"
          :globals-of="globalsOf"
          :data-tick="refreshTick"
          :presentation-mode="presentationMode"
          allow-fullscreen
          auto-refresh
        />
      </div>
    </el-scrollbar>
  </div>
  <DashboardSubscriptionDrawer
    ref="subscriptionDrawerRef"
    :dashboard-id="dashboardId"
    :dashboard-name="name"
    :view-state-json="personal.stateJson"
    :personal-views="personal.views"
  />
</template>

<style scoped lang="scss">
@use '../dashPage' as dash;
@use '@/theme/presentation.scss' as ui;

.viewer {
  @include dash.preview-tokens;
  @include dash.shell;

  position: relative;
  height: 100%;
  overflow: hidden;
  background: var(--dash-canvas-bg, var(--el-fill-color-lighter));

  &.is-compact {
    @include ui.compact-tokens;
    --dash-grid-gap: 10px;
    --dash-chrome-x: 14px;
    --dash-page-y: 8px;
    --dash-gutter: 0px;
  }
}

.viewer__state-error {
  display: flex;
  gap: 8px;
  align-items: center;
}
.viewer__run-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 8px 0;
}
.viewer__run-label {
  color: var(--el-color-primary);
}

.viewer__chrome {
  @include dash.chrome-sticky;
}

.viewer__canvas {
  @include dash.canvas;
}

.viewer__body {
  @include dash.body;
}

.viewer__unavailable {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
  padding: 48px 16px;
  box-sizing: border-box;
}
</style>
