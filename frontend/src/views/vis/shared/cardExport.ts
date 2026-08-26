import type { VisQueryConfig, VisVisualConfig } from './types'
import type { FileDownloadResult } from '@/core/request'
import dayjs from 'dayjs'
import { exportCardData } from '@/apis/vis/query'
import { needsDataset, toApiVisual } from './types'

export function resolveAllowDownload(visual?: VisVisualConfig) {
  if (!visual?.allowDownload)
    return false
  return needsDataset(visual.chartType)
}

export function cardExportFileName(cardName = '') {
  const base = sanitizeFileName(cardName)
  const stamp = dayjs().format('YYYYMMDDHHmmss')
  return base ? `${base}_${stamp}` : stamp
}

export function sanitizeFileName(name: string) {
  return name.replace(/[/\\:*?"<>|\r\n\t]/g, '_').trim()
}

export function ensureXlsxName(name: string) {
  return /\.xlsx$/i.test(name) ? name : `${name}.xlsx`
}

export function saveBlobFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportErrorMessage(e: unknown, fallback = '下载失败') {
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

export async function downloadCardExcel(options: {
  dashboardId: string
  cardId: string
  query: VisQueryConfig
  visual: VisVisualConfig
  fileName: string
  globalFilters?: VIS.FilterItem[]
  globalParams?: VIS.FilterItem[]
}) {
  const body: VIS.QueryRequest = {
    query: options.query,
    visual: toApiVisual(options.visual),
  }
  if (options.globalFilters?.length)
    body.globalFilters = options.globalFilters
  if (options.globalParams?.length)
    body.globalParams = options.globalParams
  const res = await exportCardData(
    { dashboardId: options.dashboardId, cardId: options.cardId },
    body,
    {
      responseType: 'blob',
      timeout: 120000,
    },
  ) as FileDownloadResult

  if (!(res?.blob instanceof Blob) || !res.blob.size)
    throw new Error('导出文件为空')

  saveBlobFile(res.blob, ensureXlsxName(res.filename || options.fileName))
}
