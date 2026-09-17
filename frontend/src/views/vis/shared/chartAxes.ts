import type { VisAxisOptions, VisAxisRole, VisChartOptions } from './types'

export const AXIS_ROLES: VisAxisRole[] = ['category', 'primary', 'secondary']

export function axisBoundsIssue(axis?: VisAxisOptions) {
  if (!axis)
    return ''
  if ([axis.min, axis.max].some(value => value != null && !Number.isFinite(value)))
    return '请输入有效数值'
  if (axis.min != null && axis.max != null && axis.min >= axis.max)
    return '最小值须小于最大值'
  return ''
}

export function sanitizeAxes(raw: VisChartOptions['axes']): VisChartOptions['axes'] {
  const result: NonNullable<VisChartOptions['axes']> = {}
  for (const role of AXIS_ROLES) {
    const source = raw?.[role]
    if (!source || typeof source !== 'object')
      continue
    const axis: VisAxisOptions = {}
    if (typeof source.showTitle === 'boolean')
      axis.showTitle = source.showTitle
    if (typeof source.title === 'string' && source.title.trim())
      axis.title = source.title.trim().slice(0, 100)
    if (role !== 'category' && !axisBoundsIssue(source)) {
      if (source.min != null)
        axis.min = source.min
      if (source.max != null)
        axis.max = source.max
      if (source.zero === 'include' || source.zero === 'data')
        axis.zero = source.zero
    }
    if (Object.keys(axis).length)
      result[role] = axis
  }
  return Object.keys(result).length ? result : undefined
}

/** 只覆盖已有轴，逻辑角色不随横纵方向变化。 */
export function applyAxisOptions(
  axes: Record<string, any>[],
  options: VisChartOptions['axes'],
  horizontal: boolean,
  defaults: { category: string, primary: string, secondary: string },
  percent: boolean,
) {
  const category = horizontal ? 'left' : 'bottom'
  const primary = horizontal ? 'bottom' : 'left'
  const clean = sanitizeAxes(options)
  return axes.map((axis) => {
    const role: VisAxisRole = axis.orient === category ? 'category' : axis.orient === primary ? 'primary' : 'secondary'
    const custom = clean?.[role]
    const title = axis.title ?? {}
    const next: Record<string, any> = {
      ...axis,
      title: {
        ...title,
        visible: custom?.showTitle ?? title.visible ?? false,
        text: custom?.title || title.text || defaults[role],
      },
    }
    if (role !== 'category' && !percent && custom) {
      if (custom.min != null)
        next.min = custom.min
      if (custom.max != null)
        next.max = custom.max
      if (custom.min != null || custom.max != null) {
        next.zero = false
        next.nice = false
      }
      else if (custom.zero) {
        next.zero = custom.zero === 'include'
      }
    }
    return next
  })
}
