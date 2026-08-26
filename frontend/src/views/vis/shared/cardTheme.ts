/**
 * 卡片壳：背景 / 内容色。空 = 跟随默认（日后看板主题）。
 */
import type { VisVisualConfig } from './types'

export function resolveCardChrome(visual: VisVisualConfig) {
  const bg = visual.cardBg?.trim() || ''
  const color = visual.cardColor?.trim() || ''
  return {
    bg: bg || undefined,
    color: color || undefined,
  }
}

export function pruneCardChrome(visual: VisVisualConfig) {
  const bg = visual.cardBg?.trim()
  if (bg)
    visual.cardBg = bg
  else
    delete visual.cardBg
  const color = visual.cardColor?.trim()
  if (color)
    visual.cardColor = color
  else
    delete visual.cardColor
}

/** 开标题时：自定义标题优先，空则用卡片名称 */
export function resolveCardTitle(visual: VisVisualConfig, fallbackTitle = '') {
  if (!visual.showTitle)
    return ''
  return visual.title?.trim() || fallbackTitle.trim() || ''
}

/** 开备注时：功能设置备注优先，空则用卡片描述 */
export function resolveCardRemark(visual: VisVisualConfig, fallbackDescription = '') {
  if (!visual.showDescription)
    return ''
  return visual.description?.trim() || fallbackDescription.trim() || ''
}

/** 开标题或开备注且有可展示文案时显示文案区 */
export function resolveShowTitle(
  visual: VisVisualConfig,
  fallbackTitle = '',
  fallbackDescription = '',
) {
  return !!(resolveCardTitle(visual, fallbackTitle) || resolveCardRemark(visual, fallbackDescription))
}
