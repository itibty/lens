import type { DetailHit } from '@/views/vis/shared/cardDetail'
import type { VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { queryCardDetail } from '@/apis/vis/query'
import { buildDetailRequest, detailDrawerTitle, resolveAllowDetail } from '@/views/vis/shared/cardDetail'
import { emptyQueryData } from '@/views/vis/shared/useVisCardQuery'
import { apiErrorMessage, execSqlsFromBizError, visQueryOptions } from '@/views/vis/shared/visRequest'

export interface VisCardDetailOpenPayload {
  hit: DetailHit
  query: VisQueryConfig
  visual: VisVisualConfig
  cardId: string
  globals?: VisCardDetailScope['globals']
}

export interface VisCardDetailScope {
  query: VisQueryConfig | null | undefined
  visual?: VisVisualConfig
  dashboardId?: string
  cardId?: string
  globals?: {
    globalFilters?: VIS.FilterItem[]
    globalParams?: VIS.FilterItem[]
  }
  showSql?: boolean
  onExecSqls?: (sqls: VIS.ExecSqlInfo[]) => void
}

export function useVisCardDetail(getScope: () => VisCardDetailScope) {
  const open = ref(false)
  const loading = ref(false)
  const error = ref('')
  const title = ref('全部明细')
  const tags = ref<string[]>([])
  const data = ref<VIS.QueryDataResponse>(emptyQueryData())
  let seq = 0

  function closeDetail() {
    seq++
    open.value = false
    loading.value = false
  }

  async function openDetail(hit: DetailHit) {
    const scope = getScope()
    if (!scope.query || (scope.visual && !resolveAllowDetail(scope.visual)))
      return
    const current = ++seq
    open.value = true
    title.value = detailDrawerTitle(hit)
    tags.value = hit.labels
    loading.value = true
    error.value = ''
    try {
      const res = await queryCardDetail(
        {
          dashboardId: scope.dashboardId || '0',
          cardId: scope.cardId || '0',
        },
        buildDetailRequest(scope.query, hit, scope.globals),
        visQueryOptions(scope.showSql),
      )
      if (current !== seq)
        return
      data.value = res.data ?? emptyQueryData()
      scope.onExecSqls?.(res.data?.execSqls ?? [])
    }
    catch (e) {
      if (current !== seq)
        return
      error.value = apiErrorMessage(e, '明细查询失败')
      data.value = emptyQueryData()
      scope.onExecSqls?.(execSqlsFromBizError(e))
    }
    finally {
      if (current === seq)
        loading.value = false
    }
  }

  return {
    open,
    loading,
    error,
    title,
    tags,
    data,
    openDetail,
    closeDetail,
  }
}
