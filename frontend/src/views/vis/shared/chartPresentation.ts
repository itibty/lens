import type { ISpec } from '@visactor/vchart'
import type { DashPresentationMode } from '@/views/vis/dashboards/dashPresentation'

type PlainRecord = Record<string, unknown>

function plainRecord(value: unknown): PlainRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as PlainRecord
    : null
}

function mobileAxis(axis: unknown) {
  const source = plainRecord(axis)
  if (!source)
    return axis
  const label = plainRecord(source.label) || {}
  return {
    ...source,
    label: {
      ...label,
      autoHide: true,
      autoLimit: true,
      autoRotate: true,
      minGap: Math.max(4, typeof label.minGap === 'number' ? label.minGap : 0),
    },
  }
}

function compactLegend(legend: unknown) {
  const source = plainRecord(legend)
  if (!source || (source.orient !== 'left' && source.orient !== 'right'))
    return legend
  return {
    ...source,
    orient: 'top',
    position: 'start',
    layout: 'horizontal',
    maxRow: 2,
  }
}

/**
 * 为看板移动展示生成一份保守的 VChart spec 投影。
 * 只复制需要调整的层级，避免改写卡片保存的原始 spec。
 */
export function projectChartPresentation(
  spec: ISpec,
  mode: DashPresentationMode,
): ISpec {
  if (mode !== 'compact' && mode !== 'medium')
    return spec

  const source = spec as unknown as PlainRecord
  const axes = source.axes
  const projected: PlainRecord = {
    ...source,
    ...(Array.isArray(axes) ? { axes: axes.map(mobileAxis) } : {}),
  }

  if (mode !== 'compact' || source.legends == null)
    return projected as unknown as ISpec

  projected.legends = Array.isArray(source.legends)
    ? source.legends.map(compactLegend)
    : compactLegend(source.legends)
  return projected as unknown as ISpec
}
