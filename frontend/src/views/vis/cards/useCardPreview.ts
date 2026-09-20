import type { QueryIssue } from './cardApi'
import type { DatasetField, VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { computed, nextTick, onScopeDispose, ref, shallowRef, toRaw, watch } from 'vue'
import { fromApiChartType } from '@/views/vis/shared/types'
import { emptyPivotData, emptyQueryData, fetchVisCardData } from '@/views/vis/shared/useVisCardQuery'
import { apiErrorMessage, collectQueryIssues, execSqlsFromBizError, normalizeQueryForRequest } from './cardApi'
import { previewDataKey } from './previewData'

/** 设计器预览占位：path 为 Long，服务层不使用。 */
export const PREVIEW_DASHBOARD_ID = '0'
export const PREVIEW_CARD_ID = '0'
const AUTO_PREVIEW_DELAY = 300

interface PreviewInput {
  query: VisQueryConfig
  visual: VisVisualConfig
  fields?: DatasetField[]
  enabled?: boolean
  deferUpdates?: boolean
}

interface PreviewEvents {
  onIssues: (issues: QueryIssue[]) => void
  onRows: (rows: Record<string, unknown>[]) => void
}

interface PreviewSnapshot {
  key: string
  query: VisQueryConfig
  visual: VisVisualConfig
}

/** 嵌套 reactive 无法 structuredClone；快照不能引用仍在编辑的配置。 */
function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(toRaw(value))) as T
}

/** 仅负责预览数据与刷新时机；布局、SQL 展示和明细交互留在组件。 */
export function useCardPreview(getInput: () => PreviewInput, events: PreviewEvents) {
  function snapshotConfig() {
    const { query, visual, fields } = getInput()
    return { query: clonePlain(query), visual: clonePlain(visual), fields }
  }
  // 预览只读已结束的编辑；保存与校验仍读取设计器的实时配置。
  const config = shallowRef(snapshotConfig())
  watch(getInput, (input) => {
    if (!input.deferUpdates)
      config.value = snapshotConfig()
  }, { deep: true, flush: 'post' })

  const response = ref<VIS.QueryDataResponse>(emptyQueryData())
  const pivotResponse = ref<VIS.PivotQueryResponse>(emptyPivotData())
  const execSqls = ref<VIS.ExecSqlInfo[]>([])
  const errorMsg = ref('')
  const applied = shallowRef<PreviewSnapshot | null>(null)
  const pending = shallowRef<PreviewSnapshot | null>(null)
  let previewTimer: ReturnType<typeof setTimeout> | undefined

  const enabled = computed(() => getInput().enabled !== false)
  const dataKey = computed(() => previewDataKey(config.value.query, config.value.visual))
  const validationIssues = computed(() => {
    const { query, visual, fields } = config.value
    return collectQueryIssues(visual.chartType, query, fields, visual)
  })
  const valid = computed(() => !validationIssues.value.length)
  const loading = computed(() => pending.value !== null)
  const showPreview = computed(() => applied.value !== null && valid.value)
  const appliedQuery = computed(() => applied.value?.query ?? null)
  const appliedVisual = computed(() => applied.value?.visual ?? null)

  function cancelScheduledPreview() {
    clearTimeout(previewTimer)
    previewTimer = undefined
  }

  function clearPreviewData() {
    response.value = emptyQueryData()
    pivotResponse.value = emptyPivotData()
    execSqls.value = []
    events.onRows([])
  }

  function resetPreview() {
    cancelScheduledPreview()
    pending.value = null
    applied.value = null
    errorMsg.value = ''
    clearPreviewData()
  }

  function syncVisual() {
    if (applied.value?.key === dataKey.value)
      applied.value = { ...applied.value, visual: config.value.visual }
  }

  async function loadPreview() {
    if (!enabled.value || !valid.value)
      return
    const input = config.value
    const visual = clonePlain(input.visual)
    visual.chartType = fromApiChartType(visual.chartType)
    const request: PreviewSnapshot = {
      key: dataKey.value,
      query: normalizeQueryForRequest(clonePlain(input.query), visual.chartType),
      visual,
    }
    pending.value = request
    errorMsg.value = ''
    try {
      // 静态卡片也走同一结果处理；fetchVisCardData 内部直接返回空数据。
      const result = await fetchVisCardData({
        query: request.query,
        visual: request.visual,
        dashboardId: PREVIEW_DASHBOARD_ID,
        cardId: PREVIEW_CARD_ID,
        showSql: true,
      })
      if (pending.value !== request)
        return
      response.value = result.data
      pivotResponse.value = result.pivotData
      execSqls.value = result.execSqls
      events.onRows(result.data.rows ?? [])
    }
    catch (e) {
      if (pending.value !== request)
        return
      errorMsg.value = apiErrorMessage(e, '预览失败')
      clearPreviewData()
      execSqls.value = execSqlsFromBizError(e)
    }
    finally {
      if (pending.value === request) {
        // UI 修改不打断查询，返回后用最新展示配置；失败也记住，避免改样式反复重试。
        applied.value = { ...request, visual: config.value.visual }
        pending.value = null
      }
    }
  }

  /** 用户主动刷新：显示校验提示，并跳过数据复用。 */
  async function runPreview() {
    // 先提交字段弹层等组件的本轮修改。
    await nextTick()
    config.value = snapshotConfig()
    cancelScheduledPreview()
    if (!enabled.value)
      return
    // 新对象代表一次主动校验；编辑清除错误时保留旧对象，避免重复定位。
    events.onIssues(validationIssues.value.map(issue => ({ ...issue })))
    await loadPreview()
  }

  /** 自动刷新：静默校验、复用相同参数的数据，连续修改合并为一次查询。 */
  watch([dataKey, valid, enabled], () => {
    cancelScheduledPreview()
    // 作废旧请求后，即使晚返回也无法写入预览。
    if (!enabled.value || pending.value?.key !== dataKey.value)
      pending.value = null
    if (!enabled.value || !valid.value || pending.value?.key === dataKey.value)
      return
    if (applied.value?.key === dataKey.value) {
      syncVisual()
      return
    }
    previewTimer = setTimeout(() => {
      previewTimer = undefined
      void loadPreview()
    }, AUTO_PREVIEW_DELAY)
  }, { immediate: true, flush: 'post' })

  // 纯 UI 修改只更新配置快照，不影响已有数据或正在进行的查询。
  watch(() => config.value.visual, syncVisual)

  onScopeDispose(() => {
    cancelScheduledPreview()
    pending.value = null
  })

  return { loading, errorMsg, valid, showPreview, response, pivotResponse, execSqls, appliedQuery, appliedVisual, runPreview, resetPreview }
}
