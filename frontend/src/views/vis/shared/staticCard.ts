/**
 * 纯前端卡片（富文本 / 网页）：
 * 不查数据集，正文在 visualJson；校验只看内容，预览直接渲染。
 */
import type { VisVisualConfig } from './types'
import { hasStaticModulesContent, pruneRichtextConfig, staticModulesError } from './staticModules'
import { isStaticChart } from './types'

export function resolveStaticUrl(visual?: VisVisualConfig) {
  return visual?.web?.url?.trim() ?? ''
}

export function isSafeHttpUrl(raw?: string) {
  const text = raw?.trim() ?? ''
  if (!text)
    return false
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  }
  catch {
    return false
  }
}

/** 静态卡片内容错误；非静态或内容合法时返回 null */
export function staticContentError(chartType?: string, visual?: VisVisualConfig): string | null {
  const type = String(chartType || visual?.chartType || '').toLowerCase()
  if (!isStaticChart(type))
    return null
  if (type === 'richtext')
    return staticModulesError(visual)
  const url = resolveStaticUrl(visual)
  if (!url)
    return '请输入网页地址'
  if (!isSafeHttpUrl(url))
    return '请输入有效的 http(s) 网址'
  return null
}

export function hasStaticContent(chartType?: string, visual?: VisVisualConfig) {
  const type = String(chartType || visual?.chartType || '').toLowerCase()
  if (!isStaticChart(type))
    return false
  if (type === 'richtext')
    return hasStaticModulesContent(visual)
  return isSafeHttpUrl(resolveStaticUrl(visual))
}

/** 落库时只保留当前静态类型用到的字段 */
export function pruneStaticVisual(visual: VisVisualConfig): VisVisualConfig {
  const next = { ...visual }
  if (isStaticChart(next.chartType)) {
    if (next.chartType === 'richtext')
      pruneRichtextConfig(next)
    else
      delete next.richtext
    if (next.chartType !== 'url')
      delete next.web
    return next
  }
  delete next.richtext
  delete next.web
  return next
}
