import type { DashWidget } from './dashLayout'
import { describe, expect, it } from 'vitest'
import {
  dashFlowCardHeight,
  projectDashFlowWidgets,
  resolveDashPresentationMode,
  shouldDeferDashCardQuery,
  sortByDashPosition,
} from './dashPresentation'

describe('dashboard presentation mode', () => {
  it('keeps embedded dashboards on auto mode', () => {
    expect(resolveDashPresentationMode(320, false)).toBe('auto')
    expect(resolveDashPresentationMode(1440, false)).toBe('auto')
  })

  it('uses explicit standalone breakpoints at their boundaries', () => {
    expect(resolveDashPresentationMode(599, true)).toBe('compact')
    expect(resolveDashPresentationMode(600, true)).toBe('medium')
    expect(resolveDashPresentationMode(1023, true)).toBe('medium')
    expect(resolveDashPresentationMode(1024, true)).toBe('wide')
  })

  it('only defers card queries in non-editable flow previews', () => {
    expect(shouldDeferDashCardQuery('compact', false)).toBe(true)
    expect(shouldDeferDashCardQuery('medium', false)).toBe(true)
    expect(shouldDeferDashCardQuery('wide', false)).toBe(false)
    expect(shouldDeferDashCardQuery('auto', false)).toBe(false)
    expect(shouldDeferDashCardQuery('compact', true)).toBe(false)
  })
})

describe('dashboard flow projection', () => {
  const widgets: DashWidget[] = [
    { kind: 'text', id: 'note', html: '<p>口径</p>', appearance: { surface: 'card', padding: 'md', verticalAlign: 'start' }, x: 0, y: 9, w: 24, h: 4 },
    { kind: 'card', cardId: 'table', x: 8, y: 0, w: 12, h: 10 },
    { kind: 'card', cardId: 'number-b', x: 4, y: 0, w: 4, h: 5 },
    { kind: 'card', cardId: 'number-a', x: 0, y: 0, w: 4, h: 5 },
  ]
  const chartTypes: Record<string, string> = {
    'table': 'table',
    'number-a': 'number',
    'number-b': 'number',
  }

  it('sorts the mobile document flow by y then x', () => {
    expect(sortByDashPosition(widgets).map(item => item.kind === 'card' ? item.cardId : item.id))
      .toEqual(['number-a', 'number-b', 'table', 'note'])
  })

  it('keeps compact single-column and only pairs lightweight cards in medium', () => {
    const typeOf = (cardId: string) => chartTypes[cardId]
    const compact = projectDashFlowWidgets(widgets, 'compact', typeOf)
    const medium = projectDashFlowWidgets(widgets, 'medium', typeOf)

    expect(compact.map(item => item.columnSpan)).toEqual([1, 1, 1, 1])
    expect(medium.map(item => item.columnSpan)).toEqual([1, 1, 2, 2])
  })

  it('allocates more browsing height to tables than metric cards', () => {
    expect(dashFlowCardHeight('number')).toBeLessThan(dashFlowCardHeight('table'))
    expect(dashFlowCardHeight('pivot')).toBe(dashFlowCardHeight('table'))
  })
})
