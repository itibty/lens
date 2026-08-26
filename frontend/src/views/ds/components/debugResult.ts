/**
 * DS SQL 输出面板：结果解析、错误提取、Tab 数据结构
 */
import type { ColumnInfo } from '@/components/table/ListTable.vue'

export interface SqlOutputErrorInfo {
  error?: string
  stackTrace?: string
  fallback?: string
}

/** 单次运行结果（由 edit 追加为 Tab） */
export interface SqlOutputTab {
  id: string
  title: string
  errorInfo?: SqlOutputErrorInfo
  debugInfo?: VIS.DebugSqlResponse
  columns: ColumnInfo[]
  records: any[]
  /** 这次运行送出的脚本，用来判断是否仍是当前稿 */
  sourceSql?: string
  /** 这次运行送出的参数原文 */
  sourceParams?: string
}

/** 结果 Tab 数量上限（超出时阻断并提示，不自动丢弃） */
export const SQL_OUTPUT_TAB_LIMIT = 10

export const SQL_OUTPUT_TAB_LIMIT_TIP
  = `结果最多保留 ${SQL_OUTPUT_TAB_LIMIT} 个 Tab，请先关闭后再试`

/** 从业务失败 / HTTP 失败包体中取出 DebugSqlResponse */
export function pickDebugPayload(source: unknown): VIS.DebugSqlResponse | undefined {
  if (!source || typeof source !== 'object')
    return undefined
  const obj = source as Record<string, any>
  const nested = obj.data
  if (nested && typeof nested === 'object' && (nested.error || nested.stackTrace || nested.sql))
    return nested as VIS.DebugSqlResponse
  if (obj.error || obj.stackTrace)
    return obj as VIS.DebugSqlResponse
  return undefined
}

/** 统一解析调试/运行失败信息 */
export function extractDebugErrorInfo(err: unknown): SqlOutputErrorInfo {
  const axiosData = (err as any)?.response?.data
  const bizData = err as Record<string, any> | undefined
  const payload = pickDebugPayload(axiosData)
    || pickDebugPayload(bizData)
    || pickDebugPayload(bizData?.data)

  return {
    error: payload?.error || axiosData?.error || bizData?.error,
    stackTrace: payload?.stackTrace || axiosData?.stackTrace || bizData?.stackTrace,
    fallback: axiosData?.msg
      || bizData?.msg
      || (err as any)?.message
      || String(err ?? '未知错误'),
  }
}

/** 成功包体里若带 error/stackTrace，视为业务失败 */
export function hasDebugBusinessError(data?: VIS.DebugSqlResponse): boolean {
  return !!(data?.error || data?.stackTrace)
}

/** 运行结果转表格列/行 */
export function buildExecTableRet(data?: VIS.DebugSqlResponse): {
  columns: ColumnInfo[]
  records: any[]
} {
  const { execRet, retKey, sqlType } = data || {}
  if (!execRet || !retKey || !sqlType)
    return { columns: [], records: [] }

  const rawData = sqlType === 'DQL' ? execRet[retKey] : [execRet]
  const records = Array.isArray(rawData) ? rawData : []
  if (records.length === 0)
    return { columns: [], records }

  const firstData = records[0] || {}
  const columns = Object.keys(firstData).map(key => ({
    prop: key,
    label: key,
    minWidth: 160,
  }))
  return { columns, records }
}

/**
 * 将运行响应整理为 Tab 内容（不含 id / title，由调用方编号）
 * @param data 接口成功返回体
 * @param errorInfo HTTP/网络层失败信息
 */
export function buildOutputTabPayload(
  data?: VIS.DebugSqlResponse,
  errorInfo?: SqlOutputErrorInfo,
): Omit<SqlOutputTab, 'id' | 'title'> {
  if (errorInfo) {
    return {
      errorInfo,
      columns: [],
      records: [],
    }
  }

  if (hasDebugBusinessError(data)) {
    return {
      errorInfo: {
        error: data?.error,
        stackTrace: data?.stackTrace,
      },
      debugInfo: data,
      columns: [],
      records: [],
    }
  }

  const ret = buildExecTableRet(data)
  return {
    debugInfo: data,
    columns: ret.columns,
    records: ret.records,
  }
}

/** 输出栏里最后一次「运行」（按追加顺序） */
export function latestRunTab(tabs: SqlOutputTab[]): SqlOutputTab | undefined {
  return tabs[tabs.length - 1]
}

export function isSuccessfulRun(
  tab?: SqlOutputTab,
): tab is SqlOutputTab & { debugInfo: VIS.DebugSqlResponse } {
  return !!(tab && !tab.errorInfo && tab.debugInfo)
}

export function runMatchesDraft(
  tab: SqlOutputTab | undefined,
  sql: string,
  params: string,
): boolean {
  if (!tab)
    return false
  return tab.sourceSql === sql && (tab.sourceParams ?? '{}') === (params || '{}')
}

export type CurrentRun
  = SqlOutputTab & { debugInfo: VIS.DebugSqlResponse }

export type SaveGate
  = | { ok: true, tab?: CurrentRun }
    | { ok: false, reason: string }

/** DQL 必须先跑通当前稿；DML（删除/更新等）不限制 */
export function resolveSaveGate(
  tabs: SqlOutputTab[],
  draft: { sqlId?: string, sql: string, params: string, sqlType?: VIS.ConfSqlInfo['sqlType'] },
): SaveGate {
  if (!draft.sqlId)
    return { ok: false, reason: '数据集不存在，无法保存' }

  const tab = latestRunTab(tabs)
  if (isSuccessfulRun(tab) && runMatchesDraft(tab, draft.sql, draft.params))
    return { ok: true, tab }

  if (draft.sqlType === 'DQL') {
    if (!isSuccessfulRun(tab))
      return { ok: false, reason: '请先运行成功后再保存' }
    return { ok: false, reason: '脚本或参数已修改，请重新运行后再保存' }
  }

  return { ok: true }
}
