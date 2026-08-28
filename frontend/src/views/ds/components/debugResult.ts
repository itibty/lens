/**
 * DS SQL 输出面板：结果解析、错误提取
 */
import type { ColumnInfo } from '@/components/table/ListTable.vue'

export interface SqlOutputErrorInfo {
  error?: string
  stackTrace?: string
  fallback?: string
}

/** 最近一次运行结果 */
export interface SqlOutputRun {
  id: string
  errorInfo?: SqlOutputErrorInfo
  debugInfo?: VIS.DebugSqlResponse
  columns: ColumnInfo[]
  records: any[]
  /** 这次运行送出的脚本，用来判断是否仍是当前稿 */
  sourceSql?: string
  /** 这次运行送出的参数原文 */
  sourceParams?: string
}

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
  const records = Array.isArray(data?.execRet) ? data.execRet : []
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
 * 将运行响应整理为输出内容（不含 id，由调用方编号）
 * @param data 接口成功返回体
 * @param errorInfo HTTP/网络层失败信息
 */
export function buildOutputRun(
  data?: VIS.DebugSqlResponse,
  errorInfo?: SqlOutputErrorInfo,
): Omit<SqlOutputRun, 'id'> {
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

export function isSuccessfulRun(
  run?: SqlOutputRun | null,
): run is SqlOutputRun & { debugInfo: VIS.DebugSqlResponse } {
  return !!(run && !run.errorInfo && run.debugInfo)
}

export function runMatchesDraft(
  run: SqlOutputRun | undefined,
  sql: string,
  params: string,
): boolean {
  if (!run)
    return false
  return run.sourceSql === sql && (run.sourceParams ?? '{}') === (params || '{}')
}

export type CurrentRun
  = SqlOutputRun & { debugInfo: VIS.DebugSqlResponse }

export type SaveGate
  = | { ok: true, run?: CurrentRun }
    | { ok: false, reason: string }

/** 必须先跑通当前稿才能保存 */
export function resolveSaveGate(
  run: SqlOutputRun | null | undefined,
  draft: { sqlId?: string, sql: string, params: string },
): SaveGate {
  if (!draft.sqlId)
    return { ok: false, reason: '数据集不存在，无法保存' }

  if (isSuccessfulRun(run) && runMatchesDraft(run, draft.sql, draft.params))
    return { ok: true, run }

  if (!isSuccessfulRun(run))
    return { ok: false, reason: '请先运行成功后再保存' }
  return { ok: false, reason: '脚本或参数已修改，请重新运行后再保存' }
}
