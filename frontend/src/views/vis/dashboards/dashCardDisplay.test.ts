import type { VisVisualConfig } from '../shared/types'
import type { DashWidget } from './dashLayout'
import { describe, expect, it } from 'vitest'
import { resolveCardRemark, resolveCardTitle } from '../shared/cardTheme'
import { resolveDashCardVisual, sanitizeCardDisplayOverrides } from './dashCardDisplay'
import { parseDashConfig, stringifyDashConfig } from './dashConfigCodec'
import { collectCardIds, moveCardToGroup, moveCardToRoot, removeCardFromTree } from './dashLayout'

const widgets: DashWidget[] = [
  { kind: 'card', cardId: '101', x: 0, y: 0, w: 12, h: 8 },
  { kind: 'group', id: 'g', title: '组', mode: 'tile', x: 0, y: 8, w: 12, h: 8, pages: [{ id: 'p', title: '页', items: [] }] },
]

describe('dashboard-local card display', () => {
  it('round trips absent, hidden and custom fields outside extra config', () => {
    const overrides = { 101: { title: '区域营收', description: null } }
    const raw = stringifyDashConfig([], {}, widgets, undefined, undefined, undefined, overrides)
    const config = parseDashConfig(raw)
    expect(config.cardDisplayOverrides).toEqual(overrides)
    expect(config.extra.cardDisplayOverrides).toBeUndefined()
    expect(sanitizeCardDisplayOverrides({ ...overrides, 999: { title: '外部' } }, ['101'])).toEqual(overrides)
  })

  it('keeps overrides on moves and drops them on removal', () => {
    const overrides = { 101: { title: '局部标题' } }
    const moved = moveCardToGroup(widgets, '101', 'g')
    expect(sanitizeCardDisplayOverrides(overrides, collectCardIds(moved))).toEqual(overrides)
    expect(sanitizeCardDisplayOverrides(overrides, collectCardIds(moveCardToRoot(moved, '101')))).toEqual(overrides)
    expect(sanitizeCardDisplayOverrides(overrides, collectCardIds(removeCardFromTree(moved, '101')))).toEqual({})
  })

  it('resolves independent display without mutating the shared card', () => {
    const shared: VisVisualConfig = { chartType: 'bar', showTitle: false, title: '共享标题', showDescription: true, description: '共享备注' }
    const local = resolveDashCardVisual(shared, { title: '局部标题', description: null })
    expect(resolveCardTitle(local, '原卡片')).toBe('局部标题')
    expect(resolveCardRemark(local, '原备注')).toBe('')
    expect(shared).toEqual({ chartType: 'bar', showTitle: false, title: '共享标题', showDescription: true, description: '共享备注' })
    expect(resolveDashCardVisual(shared)).toBe(shared)
    expect(resolveCardTitle(resolveDashCardVisual(shared, {}))).toBe('')
  })
})
