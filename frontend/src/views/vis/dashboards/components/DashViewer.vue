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
  DASH_PRESENTATION_MODE_KEY,
  resolveDashPresentationMode,
} from '../dashPresentation'
import { createDashCardQueryTracker, DASH_CARD_QUERY_TRACKER_KEY } from '../dashQueryTracker'
import { captureDashPreview, saveDashScreenshot } from '../dashScreenshot'
import {
  DASH_SURFACE_MODE_KEY,
  dashThemeVars,
  DEFAULT_DASH_CARD_RADIUS,
  DEFAULT_DASH_THEME,
  resolveDashSurfaceMode,
} from '../dashTheme'
import { useDashChromeScroll } from '../useDashChromeScroll'
import { useDashRefresh } from '../useDashRefresh'
import DashFilterBar from './DashFilterBar.vue'
import DashGrid from './DashGrid.vue'

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
const eagerCardQueries = ref(false)
provide(DASH_EAGER_CARD_QUERIES_KEY, readonly(eagerCardQueries))
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
provide(DASH_SURFACE_MODE_KEY, computed(() => resolveDashSurfaceMode(theme.value)))
const { refreshCards, refreshTick } = useDashRefresh()
const { chromeHidden, onCanvasScroll, revealChrome } = useDashChromeScroll()
const { pauseFilterUrl, applyFilterQuery } = useDashFilterUrl(
  filters,
  filterValues,
  () => !dashDisabled.value && !emptyText.value,
)
const capturing = ref(false)

async function waitForCardQueries(timeoutMs = 15_000) {
  await nextTick()
  await nextTick()
  await cardQueryTracker.waitForIdle(timeoutMs)
  await nextTick()
}

function openPreview() {
  if (!dashboardId.value)
    return
  const href = router.resolve({
    name: 'VisDashboardView',
    query: { id: dashboardId.value },
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
    applyFilterQuery(route.query)
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
  eagerCardQueries.value = true
  revealChrome()
  try {
    await waitForCardQueries()
    const blob = await captureDashPreview(root)
    saveDashScreenshot(blob, name.value)
    showToast('截屏已保存')
  }
  catch {
    showToast('截屏失败', 'error')
  }
  finally {
    eagerCardQueries.value = false
    capturing.value = false
  }
}

watch(
  () => routeDashboardId(),
  (id) => {
    void loadDashboard(id)
  },
  { immediate: true },
)
</script>

<template>
  <div
    :id="DASH_VIEWER_ID"
    ref="viewerRef"
    v-spinner="loading"
    class="viewer"
    :class="`is-${presentationMode}`"
    :style="themeStyle"
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
          :defs="dashDisabled ? [] : filters"
          :filter-options-dashboard-id="dashboardId"
          :presentation-mode="presentationMode"
          :preview-disabled="!dashboardId"
          :screenshotting="capturing || loading"
          @refresh="refreshCards"
          @screenshot="onScreenshot"
          @preview="openPreview"
        />
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
          v-else
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
</template>

<style scoped lang="scss">
@use '../dashPage' as dash;

.viewer {
  @include dash.preview-tokens;
  @include dash.shell;

  position: relative;
  height: 100%;
  overflow: hidden;
  background: var(--dash-canvas-bg, var(--el-fill-color-lighter));
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
