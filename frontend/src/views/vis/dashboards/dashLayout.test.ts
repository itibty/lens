import { describe, expect, it } from 'vitest'
import {
  collectCardIds,
  createTextWidget,
  dropMissingCards,
  emptyTextDraft,
  sanitizeWidgets,
  widgetKey,
  widgetMinSize,
} from './dashLayout'

describe('dashboard native text widgets', () => {
  it('keeps text in the layout without treating it as a card member', () => {
    const widgets = sanitizeWidgets([
      { kind: 'card', cardId: '101', x: 0, y: 0, w: 8, h: 8 },
      {
        kind: 'text',
        id: 'note-1',
        html: '<h3>数据口径</h3><p>按支付时间统计</p>',
        appearance: { surface: 'card', padding: 'lg', verticalAlign: 'center' },
        x: 8,
        y: 0,
        w: 8,
        h: 4,
      },
    ])

    expect(collectCardIds(widgets)).toEqual(['101'])
    expect(dropMissingCards(widgets, [])).toEqual([widgets[1]])
    expect(widgetKey(widgets[1]!)).toBe('t:note-1')
    expect(widgetMinSize(widgets[1]!)).toEqual({ minW: 4, minH: 2 })
  })

  it('normalizes text appearance and gives duplicate local ids a new id', () => {
    const widgets = sanitizeWidgets([
      {
        kind: 'text',
        id: 'same',
        html: '<p>一</p>',
        appearance: { surface: 'other', padding: 'other', verticalAlign: 'other' },
      },
      { kind: 'text', id: 'same', html: '<p>二</p>' },
    ])

    expect(widgets[0]).toMatchObject({
      kind: 'text',
      id: 'same',
      appearance: { surface: 'card', padding: 'md', verticalAlign: 'start' },
    })
    expect(widgets[1]).toMatchObject({ kind: 'text', html: '<p>二</p>' })
    expect(widgetKey(widgets[1]!)).not.toBe('t:same')
  })

  it('creates text at the next root position with dashboard-local identity', () => {
    const first = createTextWidget([], {
      ...emptyTextDraft(),
      html: '<p>说明</p>',
    })

    expect(first).toMatchObject({
      kind: 'text',
      html: '<p>说明</p>',
      appearance: { surface: 'card', padding: 'md', verticalAlign: 'start' },
      x: 0,
      y: 0,
      w: 24,
      h: 4,
    })
    expect(first.id).toMatch(/^t-/)
    expect('cardId' in first).toBe(false)
  })
})
