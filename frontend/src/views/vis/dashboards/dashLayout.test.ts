import { describe, expect, it } from 'vitest'
import { parseDashConfig, stringifyDashConfig } from './dashConfigCodec'
import {
  applyTextDraft,
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
    expect(first).not.toHaveProperty('appearance.preset')
  })

  it('preserves existing block content across save/reload without inserting any new blocks', () => {
    const original = createTextWidget([], emptyTextDraft())
    const block = '<div data-lens-note="chapter"><p data-lens-note-part="number">02</p><div data-lens-note-part="body"><h3>标题</h3><p>已有正文</p></div></div>'
    const html = `<p>已有说明</p>${block}${block}`
    const updated = applyTextDraft([original], original.id, { html, appearance: original.appearance })
    const restored = parseDashConfig(stringifyDashConfig([], {}, updated)).widgets

    expect(restored).toEqual([{ ...original, html }])
    expect(restored[0]).not.toHaveProperty('appearance.preset')
  })

  it('copies content, appearance and dimensions into an independent text widget', () => {
    const original = createTextWidget([], {
      html: '<h3>备注</h3><p><strong>保留格式</strong></p>',
      appearance: {
        ...emptyTextDraft().appearance,
        bg: '#fafafa',
        color: '#334455',
        verticalAlign: 'center',
        insets: { top: 8, right: 12, bottom: 16, left: 20 },
      },
    }, { w: 10, h: 5 })
    const copy = createTextWidget([original], original, { w: original.w, h: original.h })

    expect(copy.id).not.toBe(original.id)
    expect(copy).toMatchObject({ html: original.html, appearance: original.appearance, w: 10, h: 5, x: 10, y: 0 })
    expect(copy.appearance).not.toBe(original.appearance)
    expect(copy.appearance.insets).not.toBe(original.appearance.insets)
    const updated = applyTextDraft([original, copy], copy.id, {
      html: '<p>副本修改</p>',
      appearance: { ...copy.appearance, bg: '#ffffff', insets: { ...copy.appearance.insets!, top: 24 } },
    })
    expect(updated[0]).toEqual(original)
    expect(updated[1]).toMatchObject({ html: '<p>副本修改</p>', appearance: { bg: '#ffffff' } })
    expect(original.appearance.insets?.top).toBe(8)
    expect(updated[1]).toMatchObject({ appearance: { insets: { top: 24 } } })
    expect(parseDashConfig(stringifyDashConfig([], {}, updated)).widgets).toEqual(updated)
  })

  it('normalizes per-side padding and keeps old notes at zero padding', () => {
    const widgets = sanitizeWidgets([
      { kind: 'text', id: 'old', html: '', appearance: { padding: 'lg' } },
      { kind: 'text', id: 'new', html: '', appearance: { insets: { top: 8.6, right: -2, bottom: 120, left: '12' } } },
      { kind: 'text', id: 'zero', html: '', appearance: { insets: { top: 0, right: 0, bottom: 0, left: 0 } } },
    ])
    expect(widgets[0]).not.toHaveProperty('appearance.insets')
    expect(widgets[1]).toMatchObject({ appearance: { insets: { top: 9, right: 0, bottom: 80, left: 0 } } })
    expect(widgets[2]).not.toHaveProperty('appearance.insets')
  })

  it('drops retired preset settings and preserves legacy chapter numbers as text once', () => {
    const widgets = sanitizeWidgets([
      { kind: 'text', id: 'plain', html: '<p>原有内容</p>', appearance: { preset: 'sideline' } },
      { kind: 'text', id: 'chapter', html: '<h3>标题</h3>', appearance: { preset: 'chapter', chapterNumber: '<b>1&' } },
    ])
    expect(widgets[0]).toMatchObject({ html: '<p>原有内容</p>', appearance: emptyTextDraft().appearance })
    expect(widgets[1]).toMatchObject({ html: '<p>&lt;b&gt;1&amp;</p><h3>标题</h3>', appearance: emptyTextDraft().appearance })
    expect(parseDashConfig(stringifyDashConfig([], {}, widgets)).widgets).toEqual(widgets)
  })

  it('keeps edited and deleted content without regenerating retired preset elements', () => {
    const html = '<p>第三章</p><h3>标题</h3><hr><p>正文</p>'
    const widgets = sanitizeWidgets([
      { kind: 'text', id: 'edited', html, appearance: { preset: 'chapter', presetContent: true } },
      { kind: 'text', id: 'empty', html: '', appearance: { preset: 'chapter', presetContent: true } },
    ])
    expect(widgets[0]).toMatchObject({ html, appearance: emptyTextDraft().appearance })
    expect(widgets[1]).toMatchObject({ html: '', appearance: emptyTextDraft().appearance })
    expect(parseDashConfig(stringifyDashConfig([], {}, widgets)).widgets).toEqual(widgets)
  })
})
