import type { VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { toApiVisual } from '@/views/vis/shared/types'
import { normalizeQueryForRequest } from './cardApi'

/** 只比较实际查数参数：UI 配置、拖拽标识不触发数据请求。 */
export function previewDataKey(query: VisQueryConfig, visual: VisVisualConfig) {
  return JSON.stringify({
    query: normalizeQueryForRequest(query, visual.chartType),
    visual: toApiVisual(visual),
  })
}
