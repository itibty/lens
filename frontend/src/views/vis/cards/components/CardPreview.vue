<!--
 * @Description: 卡片预览（上栏 VisCardView / 下栏 SQL，参考 ds SqlOutputPanel）
-->
<script setup lang="ts">
import type { QueryIssue } from '../cardApi'
import type { DatasetField, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { resolveAllowDetail } from '@/views/vis/shared/cardDetail'
import { tableMarksPreviewFingerprint } from '@/views/vis/shared/tableMark'
import { fromApiChartType, isStaticChart } from '@/views/vis/shared/types'
import { useVisCardDetail } from '@/views/vis/shared/useVisCardDetail'
import { emptyPivotData, emptyQueryData, fetchVisCardData } from '@/views/vis/shared/useVisCardQuery'
import VisCardView from '@/views/vis/shared/VisCardView.vue'
import VisDetailDrawer from '@/views/vis/shared/VisDetailDrawer.vue'
import { apiErrorMessage, collectQueryIssues, execSqlsFromBizError, normalizeQueryForRequest } from '../cardApi'
import { previewTileKind, usePreviewTile } from './usePreviewTile'

const props = defineProps<{
  query: VisQueryConfig
  visual: VisVisualConfig
  /** 卡片名称；开标题且未自定义时作为默认标题 */
  title?: string
  /** 卡片描述；开备注且未填功能设置备注时作为默认备注 */
  description?: string
  fields?: DatasetField[]
}>()

const emit = defineEmits<{
  issues: [QueryIssue[]]
}>()
/** 设计器预览占位：path 为 Long，服务层不使用 */
const PREVIEW_DASHBOARD_ID = '0'
const PREVIEW_CARD_ID = '0'
const previewHostId = `vis-card-preview-${useId()}`

const SQL_HEIGHT_KEY = 'NA:vis-preview-sql-height'
const SQL_DEFAULT_HEIGHT = 220
const SQL_MIN_HEIGHT = 120
const SQL_HEADER_HEIGHT = 36

/** 嵌套 reactive 无法 structuredClone，请求体用 JSON 深拷贝 */
function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(toRaw(value))) as T
}

const loading = ref(false)
const errorMsg = ref('')
const hasPreviewed = ref(false)
const response = ref<VIS.QueryDataResponse>(emptyQueryData())
const pivotResponse = ref<VIS.PivotQueryResponse>(emptyPivotData())
const execSqls = ref<VIS.ExecSqlInfo[]>([])
/** 上次刷新时的配置快照；预览画布只吃 applied，避免 live 改类型/样式错配旧数据 */
const appliedQuery = ref<VisQueryConfig | null>(null)
const appliedVisual = ref<VisVisualConfig | null>(null)
let previewSeq = 0
let lastFeatureFp = ''
let pendingFeatureStyle = false

/** 数据模型里的字段不跟功能 / 样式自动刷新；文本 / 网页正文失焦后跟样式一起刷 */
function featureStyleFingerprint(visual: VisVisualConfig) {
  const rest: Record<string, unknown> = { ...visual }
  delete rest.chartType
  if (visual.table) {
    const table = { ...visual.table }
    const marks = tableMarksPreviewFingerprint(visual, props.query?.asOfDate)
    if (marks.length)
      table.marks = marks
    else
      delete table.marks
    if (Object.keys(table).length)
      rest.table = table
    else
      delete rest.table
  }
  return JSON.stringify(rest)
}

function isDraftingText() {
  const el = document.activeElement
  if (!(el instanceof HTMLElement))
    return false
  if (el.isContentEditable)
    return true
  if (el instanceof HTMLTextAreaElement)
    return true
  if (!(el instanceof HTMLInputElement))
    return false
  const type = el.type
  return type === 'text' || type === 'search' || type === 'number' || type === 'password'
    || type === 'tel' || type === 'url' || type === 'email' || type === ''
}

function applyPreviewSnapshot(query: VisQueryConfig, visual: VisVisualConfig) {
  appliedQuery.value = query
  appliedVisual.value = visual
  lastFeatureFp = featureStyleFingerprint(visual)
}

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
  query: appliedQuery.value,
  visual: appliedVisual.value ?? props.visual,
  dashboardId: PREVIEW_DASHBOARD_ID,
  cardId: PREVIEW_CARD_ID,
  showSql: true,
  onExecSqls: (sqls) => {
    execSqls.value = sqls
  },
}))

function resetPreview() {
  previewSeq++
  pendingFeatureStyle = false
  hasPreviewed.value = false
  errorMsg.value = ''
  appliedQuery.value = null
  appliedVisual.value = null
  lastFeatureFp = ''
  loading.value = false
  closeDetail()
  clearPreviewData()
}

function flushFeatureStyle() {
  pendingFeatureStyle = false
  if (!hasPreviewed.value)
    return
  const fp = featureStyleFingerprint(props.visual)
  if (fp === lastFeatureFp)
    return
  void runPreview()
}

function onFeatureStyleFocusOut() {
  if (!pendingFeatureStyle)
    return
  void nextTick(() => {
    if (isDraftingText())
      return
    flushFeatureStyle()
  })
}

function clearPreviewData() {
  response.value = emptyQueryData()
  pivotResponse.value = emptyPivotData()
  execSqls.value = []
}

/** 下栏 SQL：默认折叠 */
const sqlCollapsed = ref(true)
const sqlHeight = ref(SQL_DEFAULT_HEIGHT)
const sqlDragging = ref(false)
const stageRef = ref<HTMLElement>()
const tileKind = computed(() => previewTileKind(appliedVisual.value?.chartType))
const resizablePreview = computed(() => tileKind.value != null)
const { tileDragging, tileStyle, onTileDragStart } = usePreviewTile(tileKind, stageRef)

function formatExecParams(params: VIS.ExecSqlInfo['params']) {
  if (!params || !(params as unknown[]).length)
    return ''
  return JSON.stringify(params, null, 2)
}

function readStoredSqlHeight() {
  const n = Number(localStorage.getItem(SQL_HEIGHT_KEY))
  if (Number.isFinite(n) && n >= SQL_MIN_HEIGHT)
    sqlHeight.value = n
}

function persistSqlHeight() {
  localStorage.setItem(SQL_HEIGHT_KEY, String(sqlHeight.value))
}

function toggleSqlCollapse() {
  sqlCollapsed.value = !sqlCollapsed.value
}

/** 顶边拖拽改高度；折叠态拖动会先展开（同 ds SqlOutputPanel） */
function onSqlDragStart(e: MouseEvent) {
  e.preventDefault()
  if (sqlCollapsed.value) {
    sqlCollapsed.value = false
    sqlHeight.value = SQL_HEADER_HEIGHT
  }

  sqlDragging.value = true
  const startY = e.clientY
  const startH = sqlHeight.value
  const maxH = Math.floor(window.innerHeight * 0.7)

  const onMove = (ev: MouseEvent) => {
    const next = startH + (startY - ev.clientY)
    sqlHeight.value = Math.min(maxH, Math.max(SQL_HEADER_HEIGHT, next))
  }
  const onUp = () => {
    sqlDragging.value = false
    if (sqlHeight.value < SQL_MIN_HEIGHT) {
      sqlCollapsed.value = true
      readStoredSqlHeight()
    }
    else {
      persistSqlHeight()
    }
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const isStatic = computed(() => isStaticChart(props.visual.chartType))
const showSql = computed(() => hasPreviewed.value && !isStaticChart(appliedVisual.value?.chartType))

async function runPreview() {
  const seq = ++previewSeq
  const snapshotVisual = clonePlain(props.visual)
  snapshotVisual.chartType = fromApiChartType(props.visual.chartType)
  const issues = collectQueryIssues(snapshotVisual.chartType, props.query, props.fields, snapshotVisual)
  emit('issues', issues)
  if (issues.length) {
    lastFeatureFp = featureStyleFingerprint(snapshotVisual)
    if (isStaticChart(snapshotVisual.chartType)) {
      clearPreviewData()
      applyPreviewSnapshot(
        normalizeQueryForRequest(clonePlain(props.query), snapshotVisual.chartType),
        snapshotVisual,
      )
      hasPreviewed.value = true
      return
    }
    if (hasPreviewed.value)
      resetPreview()
    lastFeatureFp = featureStyleFingerprint(snapshotVisual)
    return
  }

  const snapshotQuery = normalizeQueryForRequest(clonePlain(props.query), snapshotVisual.chartType)
  errorMsg.value = ''

  if (isStaticChart(snapshotVisual.chartType)) {
    clearPreviewData()
    applyPreviewSnapshot(snapshotQuery, snapshotVisual)
    hasPreviewed.value = true
    return
  }

  loading.value = true
  try {
    const result = await fetchVisCardData({
      query: snapshotQuery,
      visual: snapshotVisual,
      dashboardId: PREVIEW_DASHBOARD_ID,
      cardId: PREVIEW_CARD_ID,
      showSql: true,
    })
    if (seq !== previewSeq)
      return
    response.value = result.data
    pivotResponse.value = result.pivotData
    execSqls.value = result.execSqls
    applyPreviewSnapshot(snapshotQuery, snapshotVisual)
    hasPreviewed.value = true
  }
  catch (e) {
    if (seq !== previewSeq)
      return
    errorMsg.value = apiErrorMessage(e, '预览失败')
    clearPreviewData()
    execSqls.value = execSqlsFromBizError(e)
    applyPreviewSnapshot(snapshotQuery, snapshotVisual)
    hasPreviewed.value = true
  }
  finally {
    if (seq === previewSeq)
      loading.value = false
  }
}

watch(
  () => props.visual,
  () => {
    if (!hasPreviewed.value)
      return
    if (isDraftingText()) {
      pendingFeatureStyle = true
      return
    }
    flushFeatureStyle()
  },
  { deep: true },
)

watch(
  () => resolveAllowDetail(props.visual),
  (ok) => {
    if (!ok)
      closeDetail()
  },
)

onMounted(() => {
  readStoredSqlHeight()
  window.addEventListener('focusout', onFeatureStyleFocusOut, true)
})

onUnmounted(() => {
  window.removeEventListener('focusout', onFeatureStyleFocusOut, true)
})

defineExpose({
  runPreview,
  resetPreview,
  closeDetail,
})
</script>

<template>
  <div
    :id="previewHostId"
    class="preview h-full flex flex-col"
    :class="{ 'is-resizing': sqlDragging || tileDragging }"
  >
    <div class="preview__main min-h-0">
      <div class="preview__main-head shrink-0">
        <span class="preview__main-title">
          预览
        </span>
        <el-button
          text
          bg
          size="small"
          :loading="loading"
          @click="runPreview"
        >
          <span class="preview__refresh-icon i-mingcute-refresh-2-line" />
          {{ isStatic ? '刷新预览' : '刷新数据' }}
        </el-button>
      </div>

      <div
        ref="stageRef"
        class="preview__stage"
        :class="{ 'is-tile-stage': resizablePreview && hasPreviewed }"
      >
        <div
          v-if="!hasPreviewed"
          class="preview__idle"
        >
          <div class="preview__idle-text">
            数据模型改完后点「{{ isStatic ? '刷新预览' : '刷新数据' }}」；功能与样式改完自动更新
          </div>
        </div>

        <div
          v-else-if="appliedVisual && appliedQuery"
          class="preview__card-host"
          :class="{ 'preview__tile': resizablePreview, 'is-resizing': tileDragging }"
          :style="resizablePreview ? tileStyle : undefined"
        >
          <VisCardView
            class="preview__card"
            :visual="appliedVisual"
            :query="appliedQuery"
            :data="response"
            :pivot-data="pivotResponse"
            :title="title"
            :description="description"
            :loading="loading"
            :error="errorMsg"
            :dashboard-id="PREVIEW_DASHBOARD_ID"
            :card-id="PREVIEW_CARD_ID"
            :embedded="resizablePreview"
            @open-detail="openDetail"
            @refresh="runPreview"
          />
          <i
            v-if="resizablePreview"
            class="preview__tile-grip"
            title="拖动预览尺寸"
            @pointerdown="onTileDragStart"
          />
        </div>
      </div>
    </div>
    <VisDetailDrawer
      v-model:open="detailOpen"
      :append-to="`#${previewHostId}`"
      :title="detailTitle"
      :tags="detailTags"
      :loading="detailLoading"
      :error="detailError"
      :data="detailData"
    />

    <div
      v-if="showSql"
      class="preview__sql"
      :class="{ 'is-collapsed': sqlCollapsed, 'is-resizing': sqlDragging }"
      :style="{ height: sqlCollapsed ? `${SQL_HEADER_HEIGHT}px` : `${sqlHeight}px` }"
    >
      <div
        class="resize-handle resize-handle--row resize-handle--top"
        title="拖动调整高度"
        @mousedown="onSqlDragStart"
      />
      <div class="preview__sql-head">
        <span class="preview__sql-title">
          SQL
        </span>
        <div
          class="preview__sql-fold clickable"
          :title="sqlCollapsed ? '展开' : '折叠'"
          @click="toggleSqlCollapse"
        >
          <i-mingcute-down-line v-if="sqlCollapsed" />
          <i-mingcute-up-line v-else />
        </div>
      </div>
      <div v-show="!sqlCollapsed" class="preview__sql-body">
        <div class="preview__sql-pane">
          <el-scrollbar class="preview__sql-scroll">
            <div class="preview__sql-inner">
              <template v-if="execSqls.length">
                <div
                  v-for="(item, index) in execSqls"
                  :key="`${item.name}-${index}`"
                  class="preview__sql-block"
                >
                  <div class="preview__sql-name">
                    {{ item.name || `SQL ${index + 1}` }}
                  </div>
                  <pre class="preview__sql-code">{{ item.sql }}<button
                    v-if="item.sql?.trim()"
                    v-copy="{ content: item.sql }"
                    type="button"
                    class="preview__sql-copy"
                    title="复制 SQL"
                  >
                    <span class="i-mingcute-copy-2-line" />
                  </button></pre>
                </div>
              </template>
              <div
                v-else
                class="preview__sql-empty"
              >
                未返回执行 SQL
              </div>
            </div>
          </el-scrollbar>
        </div>
        <div class="preview__sql-pane is-params">
          <el-scrollbar class="preview__sql-scroll">
            <div class="preview__sql-inner">
              <template v-if="execSqls.length">
                <div
                  v-for="(item, index) in execSqls"
                  :key="`p-${item.name}-${index}`"
                  class="preview__sql-block"
                >
                  <div class="preview__sql-name">
                    {{ item.name || `SQL ${index + 1}` }}
                  </div>
                  <pre class="preview__sql-code">{{ formatExecParams(item.params) || '—' }}<button
                    v-if="formatExecParams(item.params)"
                    v-copy="{ content: formatExecParams(item.params) }"
                    type="button"
                    class="preview__sql-copy"
                    title="复制参数"
                  >
                    <span class="i-mingcute-copy-2-line" />
                  </button></pre>
                </div>
              </template>
              <div
                v-else
                class="preview__sql-empty"
              >
                —
              </div>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.preview {
  --vis-preview-bg: #eef2f6;

  position: relative;
  /* 给 append 进来的 el-drawer（position:fixed）当包含块，避免盖住左侧字段架 */
  transform: translate(0, 0);
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
  background: var(--vis-preview-bg);

  &__main {
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 12px 12px 0;
    overflow: hidden;
    background: var(--vis-preview-bg);
  }

  &__main-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__main-title {
    font-size: 13px;
    font-weight: 600;
  }

  &__refresh-icon {
    margin-right: 4px;
    font-size: 16px;
  }

  &__stage {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    margin-bottom: 12px;
    border-radius: 10px;
    background: var(--vis-preview-bg);

    &.is-tile-stage {
      align-items: center;
      justify-content: center;
    }
  }

  &__tile {
    position: relative;
    flex: 0 0 auto;
    min-width: 0;
    min-height: 0;
    border: 1px solid color-mix(in srgb, var(--el-border-color) 72%, transparent);
    border-radius: 12px;
    background: var(--el-bg-color);
    box-shadow: 0 1px 2px rgb(15 23 42 / 5%);
    overflow: hidden;

    &.is-resizing {
      outline: 2px solid var(--el-color-primary);
      outline-offset: -1px;
    }
  }

  &__tile-grip {
    position: absolute;
    right: 0;
    bottom: 0;
    z-index: 4;
    width: 18px;
    height: 18px;
    cursor: nwse-resize;
    touch-action: none;

    &::before {
      content: '';
      position: absolute;
      right: 4px;
      bottom: 4px;
      width: 8px;
      height: 8px;
      border-right: 1.5px solid var(--el-text-color-placeholder);
      border-bottom: 1.5px solid var(--el-text-color-placeholder);
    }

    &:hover::before,
    .is-resizing > &::before {
      border-color: var(--el-text-color-regular);
    }
  }

  &__card-host {
    flex: 1 1 0;
    min-height: 0;
    height: 100%;

    &.preview__tile {
      flex: 0 0 auto;
      height: auto;
    }
  }

  &__card {
    flex: 1 1 0;
    min-height: 0;
    height: 100%;
  }

  &__idle {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  &__idle-text {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  &__sql {
    position: relative;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    border-top: 1px solid var(--el-border-color-lighter);
    background: #fff;
    overflow: hidden;
  }

  &__sql-head {
    flex-shrink: 0;
    height: 36px;
    padding: 0 8px 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--vis-muted-bar, #e8eef5);
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__sql-title {
    font-size: 13px;
    font-weight: 600;
  }

  &__sql-copy {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-left: 6px;
    padding: 0;
    border: none;
    border-radius: 3px;
    background: transparent;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    vertical-align: text-bottom;
    cursor: pointer;

    &:hover {
      background: var(--el-fill-color);
      color: var(--el-text-color-primary);
    }
  }

  &__sql-fold {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    color: var(--el-text-color-secondary);
    font-size: 16px;

    &:hover {
      background: var(--el-fill-color);
      color: var(--el-text-color-primary);
    }
  }

  &__sql-body {
    flex: 1;
    min-height: 0;
    height: 100%;
    display: flex;
    overflow: hidden;
  }

  &__sql-pane {
    flex: 1.4;
    min-width: 0;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--el-border-color-lighter);

    &.is-params {
      flex: 1;
      border-right: none;
    }
  }

  &__sql-scroll {
    flex: 1;
    min-height: 0;
    height: 100%;
  }

  &__sql-inner {
    padding: 10px 12px 12px;
    box-sizing: border-box;
  }

  &__sql-block + &__sql-block {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--el-border-color-extra-light);
  }

  &__sql-name {
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-secondary);
  }

  &__sql-code {
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--el-text-color-primary);
  }

  &__sql-empty {
    font-size: 12px;
    color: var(--el-text-color-placeholder);
  }
}
</style>
