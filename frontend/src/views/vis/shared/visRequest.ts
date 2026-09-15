/** 卡片编辑 / 看板设计：回传实际执行 SQL */
export const VIS_SHOW_SQL = { params: { SHOW_SQL: true } } as const

/** 可视化查数：错误画在卡片上，不走全局 toast */
export function visQueryOptions(showSql?: boolean) {
  const runId = typeof window === 'undefined' ? null : new URL(window.location.href).searchParams.get('subscriptionRunId')
  return {
    showErrorMessage: false,
    params: {
      ...(showSql ? { SHOW_SQL: true } : {}),
      ...(runId ? { subscriptionRunId: runId } : {}),
    },
  }
}

/** 拦截器业务失败时 reject 整包 `{ code, msg, data }`；查数失败仍可能带 execSqls */
export function execSqlsFromBizError(e: unknown): VIS.ExecSqlInfo[] {
  if (!e || typeof e !== 'object' || !('data' in e))
    return []
  const payload = (e as { data?: { execSqls?: VIS.ExecSqlInfo[] } }).data
  return payload?.execSqls ?? []
}

export function apiErrorMessage(e: unknown, fallback = '请求失败'): string {
  if (e && typeof e === 'object') {
    const rec = e as { msg?: unknown, response?: { data?: { msg?: unknown } } }
    if (typeof rec.msg === 'string' && rec.msg.trim())
      return rec.msg
    const nested = rec.response?.data?.msg
    if (typeof nested === 'string' && nested.trim())
      return nested
  }
  if (e instanceof Error && e.message)
    return e.message
  return fallback
}
