import { describe, expect, it } from 'vitest'
import { dashAlignmentGuides, dashGridGeometry, dashGuideLabelPosition } from './dashGridGuides'

describe('dashboard guide geometry', () => {
  it('includes the outer gutters and the gaps within a multi-column card', () => {
    const grid = dashGridGeometry(1200)!
    expect(grid.columns).toHaveLength(24)
    expect(grid.columns[0]).toEqual({ start: 12, end: 50 })
    expect(grid.columns[23]?.end).toBe(1188)
    expect(grid.rect({ x: 0, y: 0, w: 24, h: 5 }))
      .toEqual({ left: 12, top: 12, width: 1176, height: 188 })
    expect(grid.rect({ x: 8, y: 5, w: 8, h: 4 }))
      .toEqual({ left: 408, top: 212, width: 384, height: 148 })
    expect(grid.rowStep).toBe(40)
  })

  it('keeps equal-width cards equal and uses each group’s own coordinate space', () => {
    const root = dashGridGeometry(1200)!
    const group = dashGridGeometry(600)!
    const first = root.rect({ x: 0, y: 0, w: 12, h: 5 })
    const second = root.rect({ x: 12, y: 0, w: 12, h: 5 })
    expect(first.width).toBe(second.width)
    expect(second.left - first.left - first.width).toBe(12)
    expect(group.rect({ x: 0, y: 0, w: 12, h: 5 }).width).toBe(282)
    expect(first.width).toBe(582)
  })

  it('uses the same rounded container width as the grid library', () => {
    const rect = { x: 4, y: 3, w: 8, h: 5 }
    expect(dashGridGeometry(1000.4)!.rect(rect)).toEqual(dashGridGeometry(1000)!.rect(rect))
    expect(dashGridGeometry(1000.6)!.rect(rect)).toEqual(dashGridGeometry(1001)!.rect(rect))
  })

  it('does not draw misleading columns before the container can be measured', () => {
    for (const width of [0, -1, 250, 300, Number.NaN, Number.POSITIVE_INFINITY])
      expect(dashGridGeometry(width)).toBeNull()
  })
})

describe('dashboard alignment feedback', () => {
  it('ignores the active card itself, including ids serialized as strings', () => {
    const active = { i: 1, x: 0, y: 0, w: 8, h: 5 }
    expect(dashAlignmentGuides(1200, active, [{ ...active, i: '1' }])).toEqual([])
  })

  it('connects matching edges without adding a redundant center line', () => {
    const active = { i: 'a', x: 0, y: 0, w: 12, h: 5 }
    const peer = { i: 'b', x: 12, y: 0, w: 12, h: 5 }
    expect(dashAlignmentGuides(1200, active, [active, peer])).toEqual([
      { axis: 'y', position: 12, start: 12, end: 1188 },
      { axis: 'y', position: 200, start: 12, end: 1188 },
    ])
  })

  it('shows center alignment for different-width cards', () => {
    const active = { i: 'a', x: 4, y: 0, w: 8, h: 4 }
    const peer = { i: 'b', x: 0, y: 6, w: 16, h: 6 }
    expect(dashAlignmentGuides(1200, active, [peer])).toEqual([
      { axis: 'x', position: 402, start: 12, end: 480 },
    ])
  })

  it('does not treat adjacent grid coordinates across a gutter as aligned edges', () => {
    const active = { i: 'a', x: 0, y: 0, w: 8, h: 5 }
    const peer = { i: 'b', x: 8, y: 5, w: 8, h: 4 }
    expect(dashAlignmentGuides(1200, active, [peer])).toEqual([])
  })

  it('merges multiple matches into one segment per edge', () => {
    const active = { i: 'a', x: 0, y: 0, w: 8, h: 4 }
    const peers = [
      { ...active, i: 'b', y: 6 },
      { ...active, i: 'c', y: 12 },
    ]
    expect(dashAlignmentGuides(1200, active, peers)).toEqual([
      { axis: 'x', position: 12, start: 12, end: 640 },
      { axis: 'x', position: 396, start: 12, end: 640 },
    ])
  })
})

describe('dashboard size label placement', () => {
  it('anchors the label inside the bottom-left corner of the active card', () => {
    expect(dashGuideLabelPosition({ left: 400, top: 200, width: 200, height: 160 }, 1200, 800, 80))
      .toEqual({ left: 408, top: 328 })
  })

  it('keeps the same anchor when the card is at the top of the canvas', () => {
    expect(dashGuideLabelPosition({ left: 12, top: 12, width: 582, height: 188 }, 1200, 400, 96))
      .toEqual({ left: 20, top: 168 })
  })

  it('keeps the label inside a short group or narrow canvas', () => {
    expect(dashGuideLabelPosition({ left: 12, top: 12, width: 360, height: 148 }, 384, 172, 96))
      .toEqual({ left: 20, top: 128 })
    expect(dashGuideLabelPosition({ left: 460, top: 490, width: 32, height: 100 }, 500, 500, 80))
      .toEqual({ left: 416, top: 472 })
  })
})
