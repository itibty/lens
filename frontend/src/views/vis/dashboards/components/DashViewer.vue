<!--
 * @Description: 看板查看（全屏预览 / 报表中心共用）。id 优先取 path 参数，其次 query。
-->
<script setup lang="ts">
import type { DashFilterValues, VisDashFilterDef } from '../dashApi'
import type { DashWidget } from '../dashLayout'
import type { DashCardRadiusId, DashThemeId } from '../dashTheme'
import type { VisCard } from '@/views/vis/shared/types'
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
import { captureDashPreview, saveDashScreenshot } from '../dashScreenshot'
import { dashThemeVars, DEFAULT_DASH_CARD_RADIUS, DEFAULT_DASH_THEME } from '../dashTheme'
import { useDashChromeScroll } from '../useDashChromeScroll'
import { useDashRefresh } from '../useDashRefresh'
import DashFilterBar from './DashFilterBar.vue'
import DashGrid from './DashGrid.vue'

defineOptions({ name: 'DashViewer' })

const route = useRoute()
const router = useRouter()
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
const { refreshCards, refreshTick } = useDashRefresh()
const { chromeHidden, onCanvasScroll, revealChrome } = useDashChromeScroll()
const { pauseFilterUrl, applyFilterQuery } = useDashFilterUrl(
  filters,
  filterValues,
  () => !dashDisabled.value && !emptyText.value,
)
const capturing = ref(false)

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
  enabled: () => !loading.value && !dashDisabled.value && !emptyText.value,
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

async function loadDashboard(id: string) {
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
    if (!res.data) {
      resetViewer()
      emptyText.value = res.msg || '看板不存在'
      return
    }
    dashboardId.value = String(res.data.id || id)
    name.value = res.data.dashName || '看板'
    desc.value = res.data.dashDesc || ''
    dashDisabled.value = isVisDisabled(res.data.status)
    if (dashDisabled.value) {
      filters.value = []
      widgets.value = []
      cardMap.value = {}
      theme.value = DEFAULT_DASH_THEME
      cardRadius.value = DEFAULT_DASH_CARD_RADIUS
      autoRefreshSec.value = undefined
    }
    else {
      const loaded = await loadDashboardWidgets(res.data)
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
    resetViewer()
    emptyText.value = apiErrorMessage(e, '看板不存在')
  }
  finally {
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
  revealChrome()
  await nextTick()
  try {
    const blob = await captureDashPreview(root)
    saveDashScreenshot(blob, name.value)
    showToast('截屏已保存')
  }
  catch {
    showToast('截屏失败', 'error')
  }
  finally {
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
    v-spinner="loading"
    class="viewer"
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
