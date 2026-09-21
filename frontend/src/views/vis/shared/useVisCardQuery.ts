import type { VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { onScopeDispose, ref, toRaw } from 'vue'
import { queryCardData, queryCardPivot } from '@/apis/vis/query'
import { normalizeQueryForRequest, toPivotQuery } from '@/views/vis/cards/cardApi'
import { isPivotChart, isStaticChart, toApiVisual } from '@/views/vis/shared/types'
import { apiErrorMessage, visQueryOptions } from '@/views/vis/shared/visRequest'

export function emptyQueryData(): VIS.QueryDataResponse {
  return { columns: [], rows: [], total: 0, truncated: false }
}

export function emptyPivotData(): VIS.PivotQueryResponse {
  return {
    rowFields: [],
    columnFields: [],
    metrics: [],
    columns: [],
    rows: [],
    total: 0,
    truncated: false,
    columnTruncated: false,
  }
}

export interface FetchVisCardDataInput {
  query: VisQueryConfig
  visual: VisVisualConfig
  dashboardId?: string
  cardId?: string
  globalFilters?: VIS.FilterItem[]
  globalParams?: VIS.FilterItem[]
  showSql?: boolean
}

export interface FetchVisCardDataResult {
  data: VIS.QueryDataResponse
  pivotData: VIS.PivotQueryResponse
  execSqls: VIS.ExecSqlInfo[]
}

function withGlobals<T extends object>(body: T, input: FetchVisCardDataInput): T & {
  globalFilters?: VIS.FilterItem[]
  globalParams?: VIS.FilterItem[]
} {
  const next = body as T & { globalFilters?: VIS.FilterItem[], globalParams?: VIS.FilterItem[] }
  if (input.globalFilters?.length)
    next.globalFilters = input.globalFilters
  if (input.globalParams?.length)
    next.globalParams = input.globalParams
  return next
}

export async function fetchVisCardData(input: FetchVisCardDataInput): Promise<FetchVisCardDataResult> {
  if (isStaticChart(input.visual.chartType)) {
    return { data: emptyQueryData(), pivotData: emptyPivotData(), execSqls: [] }
  }
  const dashboardId = input.dashboardId || '0'
  const cardId = input.cardId || '0'
  const options = visQueryOptions(input.showSql)
  if (isPivotChart(input.visual.chartType)) {
    const res = await queryCardPivot(
      { dashboardId, cardId },
      withGlobals({
        query: toPivotQuery(input.query),
        visual: toApiVisual(input.visual),
      }, input),
      options,
    )
    return {
      data: emptyQueryData(),
      pivotData: res.data ?? emptyPivotData(),
      execSqls: res.data?.execSqls ?? [],
    }
  }
  const res = await queryCardData(
    { dashboardId, cardId },
    withGlobals({
      query: input.query,
      visual: toApiVisual(input.visual),
    }, input),
    options,
  )
  return {
    data: res.data ?? emptyQueryData(),
    pivotData: emptyPivotData(),
    execSqls: res.data?.execSqls ?? [],
  }
}

export function useVisCardQuery(getInput: () => FetchVisCardDataInput & { enabled?: boolean }) {
  const loading = ref(false)
  const refreshing = ref(false)
  const error = ref('')
  const refreshError = ref('')
  const data = ref<VIS.QueryDataResponse>(emptyQueryData())
  const pivotData = ref<VIS.PivotQueryResponse>(emptyPivotData())
  const appliedQuery = ref<VisQueryConfig | null>(null)
  const appliedVisual = ref<VisVisualConfig | null>(null)
  let seq = 0
  let appliedFingerprint = ''

  function clear() {
    data.value = emptyQueryData()
    pivotData.value = emptyPivotData()
    appliedQuery.value = null
    appliedVisual.value = null
    appliedFingerprint = ''
  }

  async function run(options?: { silent?: boolean }) {
    if (options?.silent && refreshing.value)
      return
    const input = getInput()
    const current = ++seq
    if (input.enabled === false) {
      clear()
      error.value = ''
      refreshError.value = ''
      loading.value = false
      refreshing.value = false
      return
    }
    const query = normalizeQueryForRequest(JSON.parse(JSON.stringify(toRaw(input.query))), input.visual.chartType)
    const visual = { ...input.visual }
    const fingerprint = JSON.stringify({ query, visual, dashboardId: input.dashboardId, cardId: input.cardId, filters: input.globalFilters, params: input.globalParams })
    const keepPrevious = fingerprint === appliedFingerprint
    if (!keepPrevious)
      clear()
    // 手动刷新始终显示遮罩；自动刷新仅在没有可复用结果时显示。
    loading.value = !options?.silent || !keepPrevious
    refreshing.value = true
    error.value = ''
    refreshError.value = ''
    try {
      const result = await fetchVisCardData({ ...input, query, visual })
      if (current !== seq)
        return
      data.value = result.data
      pivotData.value = result.pivotData
      appliedQuery.value = query
      appliedVisual.value = visual
      appliedFingerprint = fingerprint
    }
    catch (e) {
      if (current !== seq)
        return
      const message = apiErrorMessage(e, '查询失败')
      if (keepPrevious)
        refreshError.value = message
      else
        error.value = message
    }
    finally {
      if (current === seq) {
        loading.value = false
        refreshing.value = false
      }
    }
  }

  onScopeDispose(() => {
    seq++
  })
  return { loading, refreshing, error, refreshError, data, pivotData, appliedQuery, appliedVisual, run }
}
