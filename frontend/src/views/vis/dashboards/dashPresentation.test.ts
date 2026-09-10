import type { DashWidget } from './dashLayout'
import { describe, expect, it } from 'vitest'
import {
  dashFlowCardHeight,
  projectDashFlowCards,
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

  it('defers viewer card queries unless a caller temporarily forces eager loading', () => {
    expect(shouldDeferDashCardQuery(true, false)).toBe(true)
    expect(shouldDeferDashCardQuery(true, true)).toBe(false)
    expect(shouldDeferDashCardQuery(false, false)).toBe(false)
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

  it('keeps compact cards full width and allows lightweight medium cards to pair', () => {
    const typeOf = (cardId: string) => chartTypes[cardId]
    const compact = projectDashFlowWidgets(widgets, 'compact', typeOf)
    const medium = projectDashFlowWidgets(widgets, 'medium', typeOf)

    expect(compact.map(item => item.columnSpan)).toEqual([2, 2, 2, 2])
    expect(medium.map(item => item.columnSpan)).toEqual([1, 1, 2, 2])
  })

  it('expands an unpaired metric without reordering it across a chart or group boundary', () => {
    const list: DashWidget[] = [
      { kind: 'card', cardId: 'number-a', x: 0, y: 0, w: 6, h: 5 },
      { kind: 'card', cardId: 'line', x: 6, y: 0, w: 12, h: 10 },
      { kind: 'card', cardId: 'number-b', x: 0, y: 10, w: 6, h: 5 },
      { kind: 'group', id: 'group', title: '分组', mode: 'tile', pages: [], x: 6, y: 10, w: 18, h: 10 },
    ]
    const projected = projectDashFlowWidgets(list, 'medium', id => chartTypes[id] || 'line')
    expect(projected.map(item => item.columnSpan)).toEqual([2, 2, 2, 2])
    expect(projected.map(item => item.widget)).toEqual(list)
  })

  it('keeps compact metrics full width inside groups', () => {
    const items = ['a', 'b', 'c'].map((cardId, index) => ({ cardId, x: index * 6, y: 0, w: 6, h: 5 }))
    const compact = projectDashFlowCards(items, 'compact', () => 'number')
    const medium = projectDashFlowCards(items, 'medium', () => 'number')
    expect(compact.map(item => item.columnSpan)).toEqual([2, 2, 2])
    expect(medium.map(item => item.columnSpan)).toEqual([1, 1, 2])
    expect(compact.map(item => item.item.cardId)).toEqual(['a', 'b', 'c'])
    expect(compact.every(item => item.height === dashFlowCardHeight('number', 'compact'))).toBe(true)
    expect(projectDashFlowCards(items, 'compact', () => 'progress').map(item => item.columnSpan))
      .toEqual([2, 2, 2])
  })

  it('allocates more browsing height to tables than metric cards', () => {
    expect(dashFlowCardHeight('number')).toBeLessThan(dashFlowCardHeight('table'))
    expect(dashFlowCardHeight('pivot')).toBe(dashFlowCardHeight('table'))
  })

  it('uses the trend height as a minimum so auxiliary metrics can expand the card', () => {
    const [trend] = projectDashFlowWidgets(
      [{ kind: 'card', cardId: 'trend', x: 0, y: 0, w: 6, h: 5 }],
      'compact',
      () => 'trend',
    )
    const [groupedTrend] = projectDashFlowCards(
      [{ cardId: 'trend', x: 0, y: 0, w: 6, h: 5 }],
      'medium',
      () => 'trend',
    )

    expect(trend?.height).toBeUndefined()
    expect(trend).toMatchObject({
      minHeight: dashFlowCardHeight('trend', 'compact'),
      autoHeight: true,
    })
    expect(groupedTrend?.height).toBeUndefined()
    expect(groupedTrend).toMatchObject({
      minHeight: dashFlowCardHeight('trend', 'medium'),
      autoHeight: true,
    })
  })
})
