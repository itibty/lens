import { describe, expect, it } from 'vitest'
import { captureViewState, getDashboardViewCapabilities, parseViewState, resolveTabValues } from './dashboardViewState'
import { createEmptyGroup } from './dashLayout'

function group(id: string, cardIds: string[]) {
  return {
    ...createEmptyGroup(),
    id,
    mode: 'tabs' as const,
    pages: cardIds.map(cardId => ({ id: `page-${cardId}`, items: [{ cardId, x: 0, y: 0, w: 12, h: 8 }] })),
  }
}

describe('personal view tab state', () => {
  it('only offers customization for filters or genuinely switchable tabs', () => {
    expect(getDashboardViewCapabilities([], []).canCustomize).toBe(false)
    expect(getDashboardViewCapabilities([], [group('empty', []), group('one', ['1']), group('two', ['2'])]).canCustomize).toBe(false)
    expect(getDashboardViewCapabilities([], [group('duplicates', ['1', '1'])]).canCustomize).toBe(false)
    expect(getDashboardViewCapabilities([], [{ ...group('tile', ['1', '2']), mode: 'tile' }]).canCustomize).toBe(false)
    expect(getDashboardViewCapabilities([], [group('tabs', ['1', '2'])])).toEqual({ hasFilters: false, hasSwitchableTabs: true, canCustomize: true })
    expect(getDashboardViewCapabilities([{ uid: 'region', datasetId: '1', field: 'region', label: '地区', formType: 'select', applyAs: 'filter' }], [])).toEqual({ hasFilters: true, hasSwitchableTabs: false, canCustomize: true })
  })

  it('keeps selections through reordering and falls back only within the changed group', () => {
    const saved = { first: { activeCardId: '2' }, second: { activeCardId: '4' }, removed: { activeCardId: '5' } }
    expect(resolveTabValues([group('first', ['2', '1']), group('second', ['3']), group('new', ['6'])], saved)).toEqual({
      first: { activeCardId: '2' },
      second: { activeCardId: '3' },
      new: { activeCardId: '6' },
    })
  })

  it('drops tab state for tiled and empty groups', () => {
    expect(resolveTabValues([{ ...group('g', ['1']), mode: 'tile' }, group('empty', [])], { g: { activeCardId: '1' } })).toEqual({})
  })

  it('reads old filter-only views and captures tabs without filters', () => {
    expect(parseViewState('{"schemaVersion":1,"filters":{}}')).toEqual({ schemaVersion: 2, filters: {}, tabs: {} })
    expect(captureViewState([], {}, { z: { activeCardId: '2' }, a: { activeCardId: '1' } })).toEqual({
      schemaVersion: 2,
      filters: {},
      tabs: { a: { activeCardId: '1' }, z: { activeCardId: '2' } },
    })
    expect(Object.keys(captureViewState([], {}, { z: { activeCardId: '2' }, a: { activeCardId: '1' } }).tabs)).toEqual(['a', 'z'])
  })
})
