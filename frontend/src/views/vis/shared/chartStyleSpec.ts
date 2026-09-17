import type { VisQueryConfig, VisSeriesStyle, VisVisualConfig } from './types'
import { sanitizeSeriesStyles, seriesDimension, seriesTargetKey } from './chartSeriesStyle'
import { dimensionAlias, metricAlias, regularMetrics } from './types'

type Spec = Record<string, any>

/** VChart 的颜色比例尺统一服务图形、图例和 Tooltip；几何样式按 datum 映射。 */
export function applySeriesStyleSpec(spec: Spec, visual: VisVisualConfig | undefined, query: VisQueryConfig, globalLabel: boolean) {
  const rules = sanitizeSeriesStyles(visual?.chart?.seriesStyles, query)
  const dim = seriesDimension(query)
  const aliases = regularMetrics(query.metrics).map(metricAlias)
  const dimensionField = dim ? dimensionAlias(dim) : ''
  const styleMap = new Map(rules.map(rule => [seriesTargetKey(rule), rule.style]))
  function styleOf(datum: Spec = {}): VisSeriesStyle {
    const target = dim
      ? { dimension: dim.field, value: datum[dimensionField] }
      : { metric: String(datum.__vis_series ?? aliases[0] ?? '') }
    return styleMap.get(seriesTargetKey(target)) ?? {}
  }

  const specified = Object.fromEntries(rules.filter(rule => rule.style.color).map(rule => [
    'metric' in rule ? rule.metric : String(rule.value),
    rule.style.color,
  ]))
  const colors = Array.isArray(spec.color) ? spec.color : spec.color?.range
  spec.color = { type: 'ordinal', range: colors, specified }
  // 单指标也指定 seriesField，保证颜色映射的键与指标别名一致。
  if (!spec.seriesField && !Array.isArray(spec.series)) {
    spec.seriesField = '__vis_series'
    spec.data = spec.data.map((set: Spec) => ({
      ...set,
      values: set.values.map((row: Spec) => ({ ...row, __vis_series: aliases[0] })),
    }))
  }

  const labelsVisible = globalLabel || rules.some(rule => rule.style.dataLabel === true)
  const targets: Spec[] = Array.isArray(spec.series) ? spec.series : [spec]
  for (const target of targets) {
    const inherited = spec.label ?? {}
    const label = { ...inherited, ...target.label }
    const previousFilter = label.dataFilter
    target.label = {
      ...label,
      visible: labelsVisible,
      dataFilter: (items: Spec[]) => {
        const visible = items.filter(item => styleOf(item.data).dataLabel ?? globalLabel)
        return previousFilter ? previousFilter(visible) : visible
      },
    }
    if (target.type === 'line' || target.type === 'area') {
      target.line = {
        ...target.line,
        style: {
          ...target.line?.style,
          lineWidth: (datum: Spec) => styleOf(datum).lineWidth ?? 2,
          lineDash: (datum: Spec) => {
            const style = styleOf(datum).lineStyle
            return style === 'dashed' ? [6, 4] : style === 'dotted' ? [2, 3] : []
          },
        },
      }
      target.point = {
        ...target.point,
        style: {
          ...target.point?.style,
          visible: (datum: Spec) => styleOf(datum).points ?? true,
        },
      }
    }
  }
}
