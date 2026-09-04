import type { ISpec } from '@visactor/vchart'
import { describe, expect, it } from 'vitest'
import { projectChartPresentation } from './chartPresentation'

function specOf(value: Record<string, unknown>) {
  return value as unknown as ISpec
}

describe('projectChartPresentation', () => {
  it('leaves auto and wide specs untouched', () => {
    const spec = specOf({
      type: 'bar',
      axes: [{ orient: 'bottom', label: { visible: true } }],
      legends: { orient: 'right' },
    })

    expect(projectChartPresentation(spec, 'auto')).toBe(spec)
    expect(projectChartPresentation(spec, 'wide')).toBe(spec)
  })

  it('projects readable axis labels without mutating the source', () => {
    const formatMethod = (value: unknown) => String(value)
    const axis = {
      orient: 'bottom',
      label: { visible: true, minGap: 8, formatMethod },
    }
    const spec = specOf({ type: 'line', axes: [axis] })

    const projected = projectChartPresentation(spec, 'medium') as unknown as Record<string, unknown>
    const projectedAxis = (projected.axes as Record<string, unknown>[])[0]

    expect(projected).not.toBe(spec)
    expect(projectedAxis).not.toBe(axis)
    expect(projectedAxis.label).toMatchObject({
      visible: true,
      minGap: 8,
      formatMethod,
      autoHide: true,
      autoLimit: true,
      autoRotate: true,
    })
    expect(axis.label).toEqual({ visible: true, minGap: 8, formatMethod })
  })

  it('moves only compact side legends above the plot', () => {
    const rightLegend = { visible: true, orient: 'right', position: 'middle', title: { visible: true } }
    const bottomLegend = { visible: true, orient: 'bottom', position: 'middle' }
    const spec = specOf({ type: 'pie', legends: [rightLegend, bottomLegend] })

    const medium = projectChartPresentation(spec, 'medium') as unknown as Record<string, unknown>
    const compact = projectChartPresentation(spec, 'compact') as unknown as Record<string, unknown>
    const legends = compact.legends as Record<string, unknown>[]

    expect(medium.legends).toBe(spec.legends)
    expect(legends[0]).toMatchObject({
      visible: true,
      orient: 'top',
      position: 'start',
      layout: 'horizontal',
      maxRow: 2,
      title: { visible: true },
    })
    expect(legends[1]).toBe(bottomLegend)
    expect(rightLegend).toEqual({
      visible: true,
      orient: 'right',
      position: 'middle',
      title: { visible: true },
    })
  })

  it('supports the object form of legends', () => {
    const spec = specOf({ type: 'bar', legends: { visible: true, orient: 'left' } })
    const projected = projectChartPresentation(spec, 'compact') as unknown as Record<string, unknown>

    expect(projected.legends).toMatchObject({
      visible: true,
      orient: 'top',
      position: 'start',
      layout: 'horizontal',
    })
  })
})
