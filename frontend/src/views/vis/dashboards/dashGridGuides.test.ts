import { describe, expect, it } from 'vitest'
import { dashGridGeometry } from './dashGridGuides'

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
