import type { InjectionKey, Ref } from 'vue'
import type { VisVisualConfig } from '@/views/vis/shared/types'

/** 缺省跟随共享卡片，null 隐藏，字符串为当前看板文案。 */
export interface DashCardDisplay {
  title?: string | null
  description?: string | null
}
export type DashCardDisplayOverrides = Record<string, DashCardDisplay>

export const DASH_CARD_DISPLAY_KEY: InjectionKey<{
  overrides: Readonly<Ref<DashCardDisplayOverrides>>
  edit: (cardId: string) => void
}> = Symbol('dash-card-display')

export function sanitizeCardDisplayOverrides(raw: unknown, cardIds: string[]): DashCardDisplayOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return {}
  const members = new Set(cardIds)
  return Object.fromEntries(Object.entries(raw).flatMap(([id, value]) => {
    if (!members.has(id) || !value || typeof value !== 'object' || Array.isArray(value))
      return []
    const source = value as Record<string, unknown>
    const display: DashCardDisplay = {}
    for (const [key, max] of [['title', 50], ['description', 200]] as const) {
      if (source[key] === null)
        display[key] = null
      else if (typeof source[key] === 'string' && source[key].trim())
        display[key] = source[key].trim().slice(0, max)
    }
    return Object.keys(display).length ? [[id, display] as const] : []
  }))
}

export function resolveDashCardVisual(visual: VisVisualConfig, override?: DashCardDisplay): VisVisualConfig {
  if (!override)
    return visual
  const result = { ...visual }
  if (override.title !== undefined) {
    result.showTitle = override.title !== null
    result.title = override.title ?? ''
  }
  if (override.description !== undefined) {
    result.showDescription = override.description !== null
    result.description = override.description ?? ''
  }
  return result
}
