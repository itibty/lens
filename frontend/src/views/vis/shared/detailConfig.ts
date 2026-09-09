import type { DatasetField, VisDetailConfig, VisQueryConfig, VisVisualConfig } from './types'
import { grainDimensions, hasConfiguredDetailFields } from './cardDetail'

export const DEFAULT_DETAIL_LIMIT = 1000
export const MAX_DETAIL_LIMIT = 5000

/** 用户主动开启明细时预填原始字段；不用于兼容缺失配置。 */
export function defaultDetailFields(query?: VisQueryConfig) {
  return [...new Set([
    ...grainDimensions(query).map(item => item.field),
    ...(query?.metrics ?? []).map(item => item.field),
  ].filter(Boolean))]
}

/** 保存时只保留同数据集配置，移除旧的目标卡片规则和已删除列的附属配置。 */
export function normalizeDetailConfig(detail?: VisDetailConfig): VisDetailConfig | undefined {
  if (!detail)
    return undefined
  const fields = detail.fields ? [...new Set(detail.fields)] : undefined
  const selected = fields ? new Set(fields) : undefined
  const normalized: VisDetailConfig = {}
  if (fields)
    normalized.fields = fields
  if (detail.fieldOptions)
    normalized.fieldOptions = Object.fromEntries(Object.entries(detail.fieldOptions).filter(([field]) => !selected || selected.has(field)))
  if (detail.orderList)
    normalized.orderList = detail.orderList.filter(item => !selected || selected.has(item.field)).map(({ field, dir }) => ({ field, dir }))
  if (detail.limit != null)
    normalized.limit = detail.limit
  return normalized
}

export function detailConfigIssue(visual?: VisVisualConfig, fields?: DatasetField[]): { message: string, uid?: string } | undefined {
  if (!visual?.allowDetail)
    return
  if (!hasConfiguredDetailFields(visual))
    return { message: '请至少选择一个明细字段' }
  const selected = visual.detail!.fields!
  if (fields && selected.some(field => !fields.some(item => item.field === field)))
    return { message: '明细字段已不可用，请重新选择' }
  const limit = visual.detail?.limit ?? DEFAULT_DETAIL_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_DETAIL_LIMIT)
    return { message: `明细最多行数须在 1～${MAX_DETAIL_LIMIT} 之间`, uid: 'detail:limit' }
}
