import type { ISpec } from '@visactor/vchart'
import type { VisVisualConfig } from './types'
import {
  joinTreePath,
  TREE_CHILDREN,
  TREE_LABEL,
  TREE_NAME,
  TREE_VALUE,
} from './chartDatum'
import {
  chartCaps,
  chartHasSeries,
  chartMetricAliases,
  isDualAxisEnabled,
  isHorizontalBar,
  resolveChartOptions,
  resolveLineFields,
  resolveSecondaryFields,
} from './chartOptions'
import { isValueGradientTheme, pieGradientOrdinal, resolveChartSeriesColors, resolveChartThemeId, resolveHeatmapColorRange } from './chartPalette'
import { formatMetricField } from './fieldStyle'
import {
  defaultMarkLineField,
  markLineLabel,
  markLineStat,
  sanitizeMarkLines,
  toMarkLineSpec,
} from './markLine'
import { dimensionAlias, metricAlias, regularMetrics } from './types'

const SERIES_KEY = '__vis_series'
const SERIES_VALUE = '__vis_value'
const DATA_ID = 'visChart'
const DATA_PRIMARY = 'visChartPrimary'
const DATA_SECONDARY = 'visChartSecondary'
const SERIES_PRIMARY = 'visPrimary'
const SERIES_SECONDARY = 'visSecondary'
const SMOOTH_CURVE = 'monotone'

function chartMetrics(metrics: VIS.MetricItem[]) {
  const regulars = regularMetrics(metrics)
  return regulars.length ? regulars : metrics
}

/** 宽表多指标 → 长表，供折线 / 柱状 / 雷达按指标分系列 */
function foldMetricRows(
  rows: Record<string, any>[],
  xField: string,
  yFields: string[],
) {
  const out: Record<string, any>[] = []
  for (const row of rows) {
    for (const field of yFields) {
      out.push({
        [xField]: row[xField],
        [SERIES_KEY]: field,
        [SERIES_VALUE]: row[field],
      })
    }
  }
  return out
}

function chartData(values: Record<string, any>[]) {
  return [{ id: DATA_ID, values }]
}

function asSpec(spec: Record<string, unknown>): ISpec {
  return spec as unknown as ISpec
}

function plainRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined
  return value as Record<string, unknown>
}

function formatPct(value: number, digits: number) {
  return `${new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value)}%`
}

function datumMetricAlias(datum: Record<string, unknown> | undefined, valueField: string) {
  const series = datum?.[SERIES_KEY]
  if (typeof series === 'string' && series)
    return series
  return valueField === SERIES_VALUE ? '' : valueField
}

function formatChartNumber(
  visual: VisVisualConfig | undefined,
  query: VIS.QueryConfig | undefined,
  alias: string | undefined,
  value: unknown,
) {
  if (!alias)
    return value == null || value === '' ? '-' : String(value)
  return formatMetricField(visual, query, alias, value)
}

function formatAxisTick(
  visual: VisVisualConfig | undefined,
  query: VIS.QueryConfig | undefined,
  alias: string,
  text: string | string[],
) {
  const raw = Array.isArray(text) ? text[0] : text
  const n = Number(raw)
  if (!Number.isFinite(n))
    return text
  return formatChartNumber(visual, query, alias, n)
}

function applyAxisTickFormat(
  spec: Record<string, unknown>,
  visual: VisVisualConfig | undefined,
  query: VIS.QueryConfig | undefined,
  patches: Array<{ orient: string, alias: string }>,
) {
  const axes = spec.axes
  if (!Array.isArray(axes))
    return
  const byOrient = new Map(patches.filter(item => item.alias).map(item => [item.orient, item.alias]))
  spec.axes = axes.map((item) => {
    const axis = plainRecord(item)
    if (!axis)
      return item
    const alias = typeof axis.orient === 'string' ? byOrient.get(axis.orient) : undefined
    if (!alias || plainRecord(axis.label)?.formatMethod)
      return item
    return {
      ...axis,
      label: {
        ...plainRecord(axis.label),
        formatMethod: (text: string | string[]) => formatAxisTick(visual, query, alias, text),
      },
    }
  })
}

const SKIP_METRIC_LABEL = new Set(['wordCloud', 'treemap', 'funnel', 'tornado'])

function inferSpecValueField(spec: Record<string, unknown>) {
  if (typeof spec.valueField === 'string')
    return spec.valueField
  if (spec.direction === 'horizontal' && typeof spec.xField === 'string')
    return spec.xField
  if (typeof spec.yField === 'string')
    return spec.yField
  const series = Array.isArray(spec.series) ? plainRecord(spec.series[0]) : undefined
  if (!series)
    return undefined
  if (typeof series.valueField === 'string')
    return series.valueField
  if (series.direction === 'horizontal' && typeof series.xField === 'string')
    return series.xField
  if (typeof series.yField === 'string')
    return series.yField
  return undefined
}

function applyDefaultMetricLabel(
  spec: Record<string, unknown>,
  visual: VisVisualConfig | undefined,
  query: VIS.QueryConfig,
  valueField: string,
) {
  const label = plainRecord(spec.label) ?? {}
  spec.label = {
    ...label,
    formatMethod: (_text: unknown, datum?: Record<string, unknown>) => {
      const alias = datumMetricAlias(datum, valueField)
      return formatChartNumber(visual, query, alias, datum?.[valueField])
    },
  }
}

function dimValuePresent(value: unknown) {
  return value != null && value !== ''
}

/** 空维值会进 GROUP BY / 图例，类目和系列都会多出一项 */
function dropBlankDimRows(rows: Record<string, any>[], ...fields: (string | undefined)[]) {
  const keys = fields.filter((field): field is string => !!field)
  if (!keys.length)
    return rows
  return rows.filter(row => keys.every(key => dimValuePresent(row[key])))
}

function cartesianAxes(categoryBand = false, horizontal = false) {
  return [
    {
      orient: 'bottom',
      ...(categoryBand && !horizontal ? { type: 'band' } : {}),
      title: { visible: false },
    },
    {
      orient: 'left',
      ...(categoryBand && horizontal ? { type: 'band' } : {}),
      title: { visible: false },
    },
  ]
}

const STACK_START_PCT = '__VCHART_STACK_START_PERCENT'
const STACK_END_PCT = '__VCHART_STACK_END_PERCENT'

function stackShare(datum?: Record<string, unknown>) {
  const end = Number(datum?.[STACK_END_PCT])
  const start = Number(datum?.[STACK_START_PCT])
  if (Number.isFinite(end) && Number.isFinite(start))
    return end - start
  return Number.NaN
}

function formatPercentShare(datum?: Record<string, unknown>) {
  const share = stackShare(datum)
  if (!Number.isFinite(share))
    return '-'
  return formatPct(share * 100, 1)
}

function formatPercentTick(text: string | string[]) {
  const raw = Array.isArray(text) ? text[0] : text
  const n = Number(raw)
  if (!Number.isFinite(n))
    return text
  return formatPct(n * 100, 0)
}

function applyPercentValueAxis(spec: Record<string, unknown>, horizontal: boolean) {
  const valueOrient = horizontal ? 'bottom' : 'left'
  const axes = (Array.isArray(spec.axes) ? spec.axes : cartesianAxes()) as Record<string, unknown>[]
  spec.axes = axes.map((axis) => {
    if (axis.orient !== valueOrient)
      return axis
    return { ...axis, label: { ...plainRecord(axis.label), formatMethod: formatPercentTick } }
  })
}

function cartesianSeriesTooltipSpec(
  categoryField: string,
  seriesKey: string,
  valueField: string,
  visual?: VisVisualConfig,
  query?: VIS.QueryConfig,
  formatValue?: (datum: Record<string, unknown>) => unknown,
) {
  const title = {
    value: (datum: Record<string, unknown>) => datum?.[categoryField],
  }
  const content = [{
    key: (datum: Record<string, unknown>) => String(datum?.[seriesKey] ?? ''),
    value: (datum: Record<string, unknown>) => formatValue
      ? formatValue(datum)
      : formatChartNumber(visual, query, datumMetricAlias(datum, valueField), datum?.[valueField]),
  }]
  return {
    mark: { title, content },
    dimension: { title, content },
    group: { visible: false },
  }
}

function percentTooltipSpec(
  categoryField: string,
  seriesKey: string,
  valueField: string,
  visual?: VisVisualConfig,
  query?: VIS.QueryConfig,
) {
  return cartesianSeriesTooltipSpec(categoryField, seriesKey, valueField, visual, query, (datum) => {
    const raw = datum?.[valueField]
    const pct = formatPercentShare(datum)
    const text = formatChartNumber(visual, query, datumMetricAlias(datum, valueField), raw)
    return raw == null || raw === '' ? pct : `${text} (${pct})`
  })
}

function applyBarPercent(
  spec: Record<string, unknown>,
  opt: ReturnType<typeof resolveChartOptions>,
  categoryField: string,
  seriesKey: string,
  valueField: string,
  visual?: VisVisualConfig,
  query?: VIS.QueryConfig,
) {
  spec.percent = true
  spec.label = {
    formatMethod: (_text: unknown, datum?: Record<string, unknown>) => formatPercentShare(datum),
  }
  spec.tooltip = percentTooltipSpec(categoryField, seriesKey, valueField, visual, query)
  applyPercentValueAxis(spec, isHorizontalBar('bar', opt.orientation))
}

function axisTitle(fields: string[]) {
  return {
    visible: true,
    text: fields.join(' / '),
  }
}

function cartesianSeriesType(type: 'bar' | 'line', area: boolean) {
  if (type === 'bar')
    return 'bar'
  return area ? 'area' : 'line'
}

function applyLineShape(target: Record<string, unknown>, filled: boolean, smooth: boolean) {
  const curveType = smooth ? SMOOTH_CURVE : 'linear'
  target.line = { style: { curveType } }
  if (filled)
    target.area = { style: { curveType } }
}

function applyLineShapeToChart(spec: Record<string, unknown>, filled: boolean, smooth: boolean) {
  applyLineShape(spec, filled, smooth)
  const list = spec.series
  if (!Array.isArray(list))
    return
  list.forEach((item) => {
    if (item && typeof item === 'object')
      applyLineShape(item as Record<string, unknown>, filled, smooth)
  })
}

function chartTooltipSpec(on: boolean, extra?: Record<string, unknown>) {
  if (!on) {
    return {
      visible: false,
      mark: { visible: false },
      dimension: { visible: false },
      group: { visible: false },
    }
  }
  return extra ? { visible: true, ...extra } : { visible: true }
}

function heatmapTooltipSpec(
  xField: string,
  yField: string,
  valueField: string,
  visual?: VisVisualConfig,
  query?: VIS.QueryConfig,
) {
  return {
    mark: {
      title: {
        value: (datum: Record<string, unknown>) => `${datum?.[xField] ?? ''} / ${datum?.[yField] ?? ''}`,
      },
      content: [{
        key: valueField,
        value: (datum: Record<string, unknown>) => formatChartNumber(visual, query, valueField, datum?.[valueField]),
      }],
    },
  }
}

function metricTooltipSpec(
  categoryField: string,
  metricField: string,
  visual?: VisVisualConfig,
  query?: VIS.QueryConfig,
) {
  const title = {
    value: (datum: Record<string, unknown>) => datum?.[categoryField],
  }
  const content = [{
    key: metricField,
    value: (datum: Record<string, unknown>) => formatChartNumber(visual, query, metricField, datum?.[metricField]),
  }]
  return {
    mark: { title, content },
    dimension: { title, content },
  }
}

function formatPieShare(datum: Record<string, unknown> | undefined, valueField: string, total: number) {
  const baked = datum?._percent_
  const pct = typeof baked === 'number' && Number.isFinite(baked)
    ? baked
    : total
      ? Number(datum?.[valueField]) / total * 100
      : Number.NaN
  if (!Number.isFinite(pct))
    return '-'
  return formatPct(pct, 2)
}

function pieShareOfRows(rows: Record<string, any>[], valueField: string) {
  return rows.reduce((sum, row) => sum + (Number(row[valueField]) || 0), 0)
}

function pieLabelSpec(
  categoryField: string,
  valueField: string,
  total: number,
  visual?: VisVisualConfig,
  query?: VIS.QueryConfig,
) {
  return {
    formatMethod: (text: string | string[], datum?: Record<string, unknown>) => {
      const name = datum?.[categoryField] ?? (Array.isArray(text) ? text[0] : text)
      const value = formatChartNumber(visual, query, valueField, datum?.[valueField])
      return [`${name ?? ''}`, `${value} (${formatPieShare(datum, valueField, total)})`]
    },
  }
}

function isPieIndicatorSlice(datum: Record<string, unknown> | undefined, categoryField: string) {
  return datum?.[categoryField] != null && datum[categoryField] !== ''
}

function pieIndicatorItem(
  text: (datum?: Record<string, unknown>) => string,
) {
  return {
    visible: true,
    autoFit: true,
    autoLimit: true,
    fitPercent: 0.36,
    space: 2,
    fitStrategy: 'inscribed' as const,
    style: {
      fontSize: 12,
      fill: '#4E5969',
      text,
    },
  }
}

const PIE_EMPHASIS = {
  outerRadius: 0.85,
  stroke: '#000',
  lineWidth: 1,
}

function pieMarkSpec() {
  return {
    state: {
      hover: PIE_EMPHASIS,
      selected: PIE_EMPHASIS,
    },
  }
}

function pieIndicatorSpec(
  categoryField: string,
  valueField: string,
  total: number,
  visual?: VisVisualConfig,
  query?: VIS.QueryConfig,
) {
  return {
    visible: true,
    trigger: 'hover' as const,
    limitRatio: 0.48,
    title: {
      visible: true,
      autoFit: true,
      autoLimit: true,
      fitPercent: 0.32,
      fitStrategy: 'inscribed' as const,
      style: {
        fontSize: 14,
        fontWeight: 500,
        fill: '#1D2129',
        text: (datum?: Record<string, unknown>) =>
          isPieIndicatorSlice(datum, categoryField)
            ? String(datum![categoryField])
            : '总计',
      },
    },
    content: [
      pieIndicatorItem(datum =>
        isPieIndicatorSlice(datum, categoryField)
          ? formatChartNumber(visual, query, valueField, datum![valueField])
          : formatChartNumber(visual, query, valueField, total),
      ),
      pieIndicatorItem(datum =>
        isPieIndicatorSlice(datum, categoryField)
          ? formatPieShare(datum, valueField, total)
          : '',
      ),
    ],
  }
}

function pieTooltipSpec(
  categoryField: string,
  valueField: string,
  total: number,
  visual?: VisVisualConfig,
  query?: VIS.QueryConfig,
) {
  return {
    mark: {
      title: { value: (datum: Record<string, unknown>) => datum?.[categoryField] },
      content: [
        {
          key: valueField,
          value: (datum: Record<string, unknown>) =>
            `${formatChartNumber(visual, query, valueField, datum?.[valueField])} (${formatPieShare(datum, valueField, total)})`,
        },
      ],
    },
  }
}

const SERIES_ENCODING_KEYS = [
  'xField',
  'yField',
  'seriesField',
  'stack',
  'percent',
  'direction',
  'dataId',
] as const

/** 柱 / 线走图表级 tooltip；补 stub series 会和 seriesField 叠出额外图例 / 段 */
const SERIES_TOOLTIP_STUB_TYPES = new Set(['pie', 'radar', 'wordCloud', 'funnel'])

/** 堆叠柱标签落在各自段内，对齐 VChart bar-label：居中 + 越界贴边避让 */
function stackedBarInsideLabel(horizontal: boolean) {
  const nudge = [2, 4, 8, 10, 12]
  return {
    position: 'inside',
    smartInvert: true,
    style: {
      stroke: '#fff',
      lineWidth: 2,
    },
    overlap: {
      hideOnHit: true,
      strategy: horizontal
        ? [
            { type: 'bound', position: ['right'] },
            { type: 'moveX', offset: nudge },
          ]
        : [
            { type: 'bound', position: ['top'] },
            { type: 'moveY', offset: nudge.map(n => -n) },
          ],
    },
  }
}

function patchBarLabel(
  target: Record<string, unknown>,
  patch: ReturnType<typeof stackedBarInsideLabel>,
  base: Record<string, unknown> = {},
) {
  const extra = { ...base, ...plainRecord(target.label) }
  target.label = {
    ...extra,
    ...patch,
    style: { ...plainRecord(extra.style), ...patch.style },
  }
}

function applyStackedBarInsideLabel(spec: Record<string, unknown>, horizontal: boolean) {
  const patch = stackedBarInsideLabel(horizontal)
  const chartLabel = plainRecord(spec.label) ?? {}
  const list = spec.series
  if (Array.isArray(list) && list.length) {
    let patched = false
    for (const item of list) {
      const series = plainRecord(item)
      if (!series || series.type !== 'bar' || series.stack !== true)
        continue
      patchBarLabel(series, patch, chartLabel)
      patched = true
    }
    if (patched)
      return
  }
  if (spec.type === 'bar' && spec.stack === true)
    patchBarLabel(spec, patch)
}

function applySeriesTooltip(spec: Record<string, unknown>, tooltip: ReturnType<typeof chartTooltipSpec>) {
  const list = spec.series
  if (Array.isArray(list) && list.length) {
    list.forEach((item) => {
      const series = plainRecord(item)
      if (series)
        series.tooltip = tooltip
    })
    return
  }
  // 词云要在系列上关提示；雷达 / 饼图缺 type 会报 transformerConstructor
  const type = typeof spec.type === 'string' ? spec.type : ''
  if (!SERIES_TOOLTIP_STUB_TYPES.has(type))
    return
  const series: Record<string, unknown> = { type, tooltip }
  if (typeof spec.name === 'string' && spec.name)
    series.name = spec.name
  for (const key of SERIES_ENCODING_KEYS) {
    if (spec[key] !== undefined)
      series[key] = spec[key]
  }
  spec.series = [series]
}

const CATEGORY_AXIS_ID = 'visCategory'

function seriesGroupCount(spec: Record<string, unknown>, stacked: boolean) {
  if (stacked)
    return 1
  const seen = new Set<string>()
  const datasets = Array.isArray(spec.data) ? spec.data : []
  for (const item of datasets) {
    const rec = plainRecord(item)
    const values = rec && Array.isArray(rec.values) ? rec.values : []
    for (const row of values) {
      const data = plainRecord(row)
      const series = data?.[SERIES_KEY]
      if (series != null && series !== '')
        seen.add(String(series))
    }
  }
  return Math.max(1, seen.size)
}

function categoryMinBandSize(horizontal: boolean, groupCount: number) {
  const n = Math.max(1, groupCount)
  return horizontal ? Math.max(22, 14 * n + 8) : Math.max(28, 16 * n + 10)
}

function categoryAxisIndex(axes: Record<string, unknown>[], horizontal: boolean) {
  const orient = horizontal ? 'left' : 'bottom'
  const byOrient = axes.findIndex(axis =>
    axis.orient === orient && (axis.type === 'band' || axis.type == null))
  if (byOrient >= 0)
    return byOrient
  return axes.findIndex(axis => axis.type === 'band')
}

/** 只滚类目轴：纵向在下、横向在右；双轴仍绑同一条 band 轴 */
function applyCategoryScrollBar(
  spec: Record<string, unknown>,
  horizontal: boolean,
  stacked: boolean,
) {
  const axes = (Array.isArray(spec.axes) ? spec.axes : []) as Record<string, unknown>[]
  const index = categoryAxisIndex(axes, horizontal)
  if (index < 0)
    return
  const axis = axes[index]
  axis.id = typeof axis.id === 'string' && axis.id ? axis.id : CATEGORY_AXIS_ID
  axis.type = 'band'
  axis.minBandSize = categoryMinBandSize(horizontal, seriesGroupCount(spec, stacked))
  spec.scrollBar = [{
    visible: true,
    orient: horizontal ? 'right' : 'bottom',
    axisId: axis.id,
    auto: true,
    filterMode: 'axis',
    roamScroll: true,
    roamDrag: true,
    roamZoom: false,
  }]
}

function hairLine() {
  return { visible: true, type: 'line' as const }
}

function hairRect() {
  return { visible: true, type: 'rect' as const }
}

/** 笛卡尔十字线：柱状类目用 rect，其余用 line；横向柱对调。双轴 spec.type 是 common，按 chartType 判断 */
function applyCartesianCrosshair(
  spec: Record<string, unknown>,
  chartType: string,
  horizontal: boolean,
) {
  const category = chartType === 'bar' ? hairRect() : hairLine()
  spec.crosshair = {
    xField: { visible: true, line: horizontal ? hairLine() : category },
    yField: { visible: true, line: horizontal ? category : hairLine() },
  }
}

function applyCartesianChrome(
  spec: Record<string, unknown>,
  chartType: string,
  opt: ReturnType<typeof resolveChartOptions>,
  caps: ReturnType<typeof chartCaps>,
) {
  const horizontal = isHorizontalBar(chartType, opt.orientation)
  if (caps.scrollbar && opt.scrollbar)
    applyCategoryScrollBar(spec, horizontal, opt.stacked)
  if (caps.crosshair && opt.crosshair)
    applyCartesianCrosshair(spec, chartType, horizontal)
}

function specDatasets(spec: Record<string, unknown>) {
  const data = spec.data
  if (Array.isArray(data))
    return data
  if (data && typeof data === 'object')
    return [data]
  return []
}

function datasetRows(set: unknown) {
  const values = plainRecord(set)?.values
  if (!Array.isArray(values))
    return []
  return values.filter((row): row is Record<string, unknown> =>
    !!row && typeof row === 'object' && !Array.isArray(row),
  )
}

function toFiniteNumber(value: unknown) {
  if (value == null || value === '')
    return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function collectMetricValues(spec: Record<string, unknown>, field: string) {
  const out: number[] = []
  for (const set of specDatasets(spec)) {
    for (const row of datasetRows(set)) {
      const n = row[SERIES_KEY] != null
        ? (row[SERIES_KEY] === field ? toFiniteNumber(row[SERIES_VALUE]) : undefined)
        : toFiniteNumber(row[field])
      if (n != null)
        out.push(n)
    }
  }
  return out
}

function findRelativeSeriesId(spec: Record<string, unknown>, field: string) {
  const series = spec.series
  if (!Array.isArray(series) || !series.length)
    return undefined
  const datasets = specDatasets(spec)
  for (const item of series) {
    const rec = plainRecord(item)
    if (!rec || typeof rec.id !== 'string')
      continue
    const dataId = rec.dataId ?? DATA_ID
    const set = datasets.find(entry => plainRecord(entry)?.id === dataId) ?? datasets[0]
    const hit = datasetRows(set).some(row =>
      row[SERIES_KEY] === field || (row[SERIES_KEY] == null && row[field] != null),
    )
    if (hit)
      return rec.id
  }
}

function applyMarkLines(
  spec: Record<string, unknown>,
  visual: VisVisualConfig | undefined,
  chartType: string,
  query: VIS.QueryConfig,
  opt: ReturnType<typeof resolveChartOptions>,
) {
  if (!chartCaps(chartType).markLine || opt.percent) {
    delete spec.markLine
    return
  }
  const yFields = chartMetricAliases(query)
  const lines = sanitizeMarkLines(visual?.chart?.markLines, yFields)
  if (!lines.length) {
    delete spec.markLine
    return
  }
  const defaultField = defaultMarkLineField(chartType, yFields)
  const xMetric = String(chartType || '').toLowerCase() === 'scatter' ? yFields[0] : undefined
  const horizontal = isHorizontalBar(chartType, opt.orientation)
  const items = []
  for (const line of lines) {
    const field = line.field && yFields.includes(line.field) ? line.field : defaultField
    if (!field)
      continue
    const value = line.kind === 'fixed'
      ? line.value
      : markLineStat(collectMetricValues(spec, field), line.kind)
    if (value == null || !Number.isFinite(value))
      continue
    items.push(toMarkLineSpec({
      axis: horizontal || field === xMetric ? 'x' : 'y',
      value,
      text: line.label
        ? line.label
        : line.kind === 'fixed'
          ? formatChartNumber(visual, query, field, value)
          : markLineLabel(line, value),
      relativeSeriesId: findRelativeSeriesId(spec, field),
    }))
  }
  if (items.length)
    spec.markLine = items
  else
    delete spec.markLine
}

function applyChartLook(
  spec: Record<string, unknown>,
  visual: VisVisualConfig | undefined,
  chartType: string,
  query: VIS.QueryConfig,
) {
  const opt = resolveChartOptions(visual, chartType, chartHasSeries(chartType, query))
  const caps = chartCaps(chartType)
  const extra = plainRecord(spec.tooltip)
  const tooltip = chartTooltipSpec(opt.tooltip, extra)

  spec.tooltip = tooltip
  applySeriesTooltip(spec, tooltip)

  if (caps.legend) {
    spec.legends = opt.legend
      ? {
          visible: true,
          orient: opt.legendPosition,
          position: 'middle',
        }
      : { visible: false }
  }

  if (caps.dataLabel) {
    spec.label = { ...plainRecord(spec.label), visible: opt.dataLabel }
    if (opt.dataLabel && opt.stacked)
      applyStackedBarInsideLabel(spec, isHorizontalBar(chartType, opt.orientation))
  }

  const colors = resolveChartSeriesColors(visual)
  if (colors)
    spec.color = colors

  applyCartesianChrome(spec, chartType, opt, caps)
  applyMarkLines(spec, visual, chartType, query, opt)

  if (!spec.percent && !SKIP_METRIC_LABEL.has(chartType)) {
    const valueField = inferSpecValueField(spec)
    if (caps.dataLabel && opt.dataLabel && valueField && !plainRecord(spec.label)?.formatMethod)
      applyDefaultMetricLabel(spec, visual, query, valueField)
    const aliases = chartMetricAliases(query)
    const horizontal = isHorizontalBar(chartType, opt.orientation)
    if (chartType === 'scatter' && aliases[0] && aliases[1]) {
      applyAxisTickFormat(spec, visual, query, [
        { orient: 'bottom', alias: aliases[0] },
        { orient: 'left', alias: aliases[1] },
      ])
    }
    else if (aliases[0]) {
      applyAxisTickFormat(spec, visual, query, [
        { orient: horizontal ? 'bottom' : 'left', alias: aliases[0] },
      ])
    }
  }

  return spec
}

function applyValueGradient(
  spec: Record<string, unknown>,
  visual: VisVisualConfig | undefined,
  chartType: string,
  rows: Record<string, any>[],
  categoryField: string,
  valueField: string,
) {
  if (!isValueGradientTheme(visual, chartType))
    return spec
  const { domain, range } = pieGradientOrdinal(rows, categoryField, valueField, resolveChartThemeId(visual))
  spec.color = {
    type: 'ordinal',
    domain,
    range,
  }
  return spec
}

function bindCartesianFields(
  series: Record<string, unknown>,
  type: 'bar' | 'line',
  category: string,
  value: string,
  seriesKey: string | undefined,
  horizontal: boolean,
  nestSeriesOnAxis = false,
) {
  // 分组：第 2 维嵌进类目轴并排；堆叠：x 只用第 1 维。双轴分组同理，避免主副轴重叠
  const axisField = type === 'bar' && seriesKey && nestSeriesOnAxis ? [category, seriesKey] : category
  if (horizontal) {
    series.direction = 'horizontal'
    series.xField = value
    series.yField = axisField
    return
  }
  series.xField = axisField
  series.yField = value
}

function buildDualAxisSpec(
  type: 'bar' | 'line',
  rows: Record<string, any>[],
  xField: string,
  yFields: string[],
  visual: VisVisualConfig | undefined,
  query: VIS.QueryConfig,
  opt: ReturnType<typeof resolveChartOptions>,
): ISpec {
  rows = dropBlankDimRows(rows, xField)
  const secondary = resolveSecondaryFields(visual, yFields, type)
  const primary = yFields.filter(field => !secondary.includes(field))
  const horizontal = isHorizontalBar(type, opt.orientation)
  const seriesType = cartesianSeriesType(type, opt.area)

  function makeSeries(id: string, dataId: string, fields: string[]) {
    if (!fields.length)
      return null
    const series: Record<string, unknown> = {
      id,
      type: seriesType,
      dataId,
      seriesField: SERIES_KEY,
    }
    // 柱状双轴：类目轴内层 band 按指标错开，避免主副轴柱子叠在同一位置
    bindCartesianFields(
      series,
      type,
      xField,
      SERIES_VALUE,
      SERIES_KEY,
      horizontal,
      type === 'bar',
    )
    if (type === 'bar' || type === 'line')
      series.stack = false
    if (type === 'line')
      applyLineShape(series, opt.area, opt.smooth)
    return {
      series,
      data: { id: dataId, values: foldMetricRows(rows, xField, fields) },
    }
  }

  const left = makeSeries(SERIES_PRIMARY, DATA_PRIMARY, primary)
  const right = makeSeries(SERIES_SECONDARY, DATA_SECONDARY, secondary)
  const categoryOrient = horizontal ? 'left' : 'bottom'
  const primaryOrient = horizontal ? 'bottom' : 'left'
  const secondaryOrient = horizontal ? 'top' : 'right'
  const data = [left, right].filter(Boolean).map(item => item!.data)
  const series = [left, right].filter(Boolean).map(item => item!.series)
  const axes: Record<string, unknown>[] = [
    { orient: categoryOrient, type: 'band', title: { visible: false } },
  ]
  if (left) {
    axes.push({
      orient: primaryOrient,
      type: 'linear',
      seriesId: SERIES_PRIMARY,
      title: axisTitle(primary),
    })
  }
  if (right) {
    axes.push({
      orient: secondaryOrient,
      type: 'linear',
      seriesId: SERIES_SECONDARY,
      title: axisTitle(secondary),
    })
  }

  const looked = applyChartLook({
    type: 'common',
    background: 'transparent',
    data,
    series,
    axes,
    tooltip: cartesianSeriesTooltipSpec(xField, SERIES_KEY, SERIES_VALUE, visual, query),
  }, visual, type, query) as Record<string, unknown>
  applyAxisTickFormat(looked, visual, query, [
    ...(left && primary[0] ? [{ orient: primaryOrient, alias: primary[0] }] : []),
    ...(right && secondary[0] ? [{ orient: secondaryOrient, alias: secondary[0] }] : []),
  ])
  return asSpec(looked)
}

function buildCartesianSpec(
  type: 'bar' | 'line',
  rows: Record<string, any>[],
  xField: string,
  metrics: VIS.MetricItem[],
  seriesField: string | undefined,
  visual: VisVisualConfig | undefined,
  query: VIS.QueryConfig,
): ISpec | null {
  const yFields = chartMetrics(metrics).map(metricAlias).filter(Boolean)
  if (!yFields.length)
    return null

  const multiMetric = yFields.length > 1
  const y = multiMetric ? SERIES_VALUE : yFields[0]
  const series = multiMetric ? SERIES_KEY : seriesField
  const opt = resolveChartOptions(visual, type, !!series)
  const horizontal = isHorizontalBar(type, opt.orientation)
  const chartRows = dropBlankDimRows(rows, xField, multiMetric ? undefined : seriesField)
  if (!chartRows.length)
    return null
  const values = multiMetric ? foldMetricRows(chartRows, xField, yFields) : chartRows

  if (isDualAxisEnabled(visual, type, yFields))
    return buildDualAxisSpec(type, chartRows, xField, yFields, visual, query, opt)

  const spec: Record<string, unknown> = {
    background: 'transparent',
    data: chartData(values),
    axes: cartesianAxes(true, horizontal),
    ...(series ? { seriesField: series } : { name: y, tooltip: metricTooltipSpec(xField, y, visual, query) }),
  }

  if (type === 'bar') {
    spec.type = 'bar'
    bindCartesianFields(
      spec,
      type,
      xField,
      y,
      series,
      horizontal,
      !opt.stacked && !!series,
    )
    if (series) {
      spec.stack = !!opt.stacked
      spec.tooltip = cartesianSeriesTooltipSpec(xField, series, y, visual, query)
      if (opt.stacked && opt.percent)
        applyBarPercent(spec, opt, xField, series, y, visual, query)
    }
    return asSpec(applyChartLook(spec, visual, type, query))
  }

  spec.type = cartesianSeriesType(type, opt.area)
  spec.xField = xField
  spec.yField = y
  if (series) {
    spec.stack = !!opt.stacked
    spec.tooltip = cartesianSeriesTooltipSpec(xField, series, y, visual, query)
  }
  const looked = applyChartLook(spec, visual, type, query) as Record<string, unknown>
  applyLineShapeToChart(looked, opt.area, opt.smooth)
  return asSpec(looked)
}

function buildComboSpec(
  rows: Record<string, any>[],
  xField: string,
  yFields: string[],
  visual: VisVisualConfig | undefined,
  query: VIS.QueryConfig,
  opt: ReturnType<typeof resolveChartOptions>,
): ISpec | null {
  const lineFields = new Set(resolveLineFields(visual, yFields))
  const dual = isDualAxisEnabled(visual, 'combo', yFields)
  const secondary = dual ? resolveSecondaryFields(visual, yFields, 'combo') : []
  const primary = dual
    ? yFields.filter(field => !secondary.includes(field))
    : yFields

  function pick(axisFields: string[], line: boolean) {
    return axisFields.filter(field => lineFields.has(field) === line)
  }

  const groups = [
    { id: 'visBarPrimary', mark: 'bar' as const, fields: pick(primary, false), axis: 'primary' as const },
    { id: 'visBarSecondary', mark: 'bar' as const, fields: pick(secondary, false), axis: 'secondary' as const },
    { id: 'visLinePrimary', mark: 'line' as const, fields: pick(primary, true), axis: 'primary' as const },
    { id: 'visLineSecondary', mark: 'line' as const, fields: pick(secondary, true), axis: 'secondary' as const },
  ].filter(group => group.fields.length)
  if (!groups.length)
    return null

  const stacked = opt.stacked && !dual && pick(yFields, false).length > 1
  const chartRows = dropBlankDimRows(rows, xField)
  if (!chartRows.length)
    return null
  const data = groups.map(group => ({
    id: group.id,
    values: foldMetricRows(chartRows, xField, group.fields),
  }))
  const series = groups.map((group) => {
    const item: Record<string, unknown> = {
      id: group.id,
      type: cartesianSeriesType(group.mark, opt.area),
      dataId: group.id,
      seriesField: SERIES_KEY,
    }
    bindCartesianFields(
      item,
      group.mark,
      xField,
      SERIES_VALUE,
      SERIES_KEY,
      false,
      group.mark === 'bar' && !stacked,
    )
    if (group.mark === 'bar')
      item.stack = stacked
    if (group.mark === 'line')
      applyLineShape(item, opt.area, opt.smooth)
    return item
  })

  const axes: Record<string, unknown>[] = [
    { orient: 'bottom', type: 'band', title: { visible: false } },
  ]
  const primaryIds = groups.filter(group => group.axis === 'primary').map(group => group.id)
  const secondaryIds = groups.filter(group => group.axis === 'secondary').map(group => group.id)
  if (primaryIds.length) {
    axes.push({
      orient: 'left',
      type: 'linear',
      seriesId: primaryIds.length === 1 ? primaryIds[0] : primaryIds,
      title: axisTitle(primary),
    })
  }
  if (secondaryIds.length) {
    axes.push({
      orient: 'right',
      type: 'linear',
      seriesId: secondaryIds.length === 1 ? secondaryIds[0] : secondaryIds,
      title: axisTitle(secondary),
    })
  }

  const looked = applyChartLook({
    type: 'common',
    background: 'transparent',
    data,
    series,
    axes,
    tooltip: cartesianSeriesTooltipSpec(xField, SERIES_KEY, SERIES_VALUE, visual, query),
  }, visual, 'combo', query) as Record<string, unknown>
  applyAxisTickFormat(looked, visual, query, [
    ...(primary[0] ? [{ orient: 'left', alias: primary[0] }] : []),
    ...(secondary[0] ? [{ orient: 'right', alias: secondary[0] }] : []),
  ])
  return asSpec(looked)
}

function dimText(value: unknown) {
  return value == null ? '' : String(value)
}

function nestTreemapNodes(
  rows: Record<string, any>[],
  fields: string[],
  valueField: string,
  inherited: Record<string, unknown> = {},
  parentPath = '',
): Record<string, any>[] {
  const field = fields[0]
  const rest = fields.slice(1)
  const groups = new Map<string, { key: unknown, rows: Record<string, any>[] }>()
  for (const row of rows) {
    const key = row[field]
    const id = dimText(key)
    const bucket = groups.get(id) ?? { key, rows: [] as Record<string, any>[] }
    bucket.rows.push(row)
    groups.set(id, bucket)
  }
  const nodes: Record<string, any>[] = []
  for (const [id, bucket] of groups) {
    const label = id
    const path = joinTreePath(parentPath, label)
    const dims = { ...inherited, [field]: bucket.key }
    if (!rest.length) {
      let value = 0
      for (const row of bucket.rows)
        value += Number(row[valueField]) || 0
      nodes.push({
        [TREE_NAME]: path,
        [TREE_LABEL]: label,
        [TREE_VALUE]: value,
        [valueField]: value,
        ...dims,
      })
      continue
    }
    const children = nestTreemapNodes(bucket.rows, rest, valueField, dims, path)
    if (!children.length)
      continue
    nodes.push({
      [TREE_NAME]: path,
      [TREE_LABEL]: label,
      [TREE_CHILDREN]: children,
      ...dims,
    })
  }
  return nodes
}

function collectTreemapLeaves(nodes: Record<string, any>[]): Record<string, any>[] {
  const out: Record<string, any>[] = []
  for (const node of nodes) {
    const children = node[TREE_CHILDREN]
    if (Array.isArray(children) && children.length)
      out.push(...collectTreemapLeaves(children))
    else
      out.push(node)
  }
  return out
}

function treemapTooltipSpec(
  valueField: string,
  total: number,
  visual?: VisVisualConfig,
  query?: VIS.QueryConfig,
) {
  return {
    mark: {
      title: {
        value: (datum: Record<string, unknown>) => datum?.[TREE_NAME] || datum?.[TREE_LABEL] || '',
      },
      content: [{
        key: valueField,
        value: (datum: Record<string, unknown>) => {
          const raw = datum?.[TREE_VALUE] ?? datum?.[valueField]
          return `${formatChartNumber(visual, query, valueField, raw)} (${formatPieShare({ [valueField]: raw }, valueField, total)})`
        },
      }],
    },
  }
}

function buildTreemapSpec(
  rows: Record<string, any>[],
  dimFields: string[],
  valueField: string,
  visual: VisVisualConfig | undefined,
  query: VIS.QueryConfig,
): ISpec | null {
  const values = dropBlankDimRows(rows, ...dimFields)
  if (!values.length)
    return null
  const nodes = nestTreemapNodes(values, dimFields, valueField)
  if (!nodes.length)
    return null
  const tree = dimFields.length === 1
    ? [{ [TREE_NAME]: '', [TREE_CHILDREN]: nodes }]
    : nodes
  const leaves = collectTreemapLeaves(tree)
  const total = pieShareOfRows(leaves, TREE_VALUE)
  return asSpec(applyValueGradient(
    applyChartLook({
      type: 'treemap',
      background: 'transparent',
      data: chartData(tree),
      categoryField: TREE_NAME,
      valueField: TREE_VALUE,
      gapWidth: 2,
      drill: false,
      roam: false,
      leaf: {
        style: {
          stroke: '#fff',
          lineWidth: 1,
        },
      },
      label: {
        smartInvert: true,
        formatMethod: (_text: unknown, datum?: Record<string, unknown>) =>
          datum?.[TREE_LABEL] || datum?.[TREE_NAME] || '',
      },
      tooltip: treemapTooltipSpec(valueField, total, visual, query),
    }, visual, 'treemap', query),
    visual,
    'treemap',
    leaves,
    TREE_NAME,
    TREE_VALUE,
  ))
}

function heatmapBandAxis(orient: 'bottom' | 'left') {
  return {
    orient,
    type: 'band',
    title: { visible: false },
    grid: { visible: false },
    domainLine: { visible: false },
    bandPadding: 0,
  }
}

function applyHeatmapColor(
  spec: Record<string, unknown>,
  visual: VisVisualConfig | undefined,
  valueField: string,
) {
  spec.color = {
    type: 'linear',
    domain: [{ dataId: DATA_ID, fields: [valueField] }],
    range: resolveHeatmapColorRange(visual),
  }
  const opt = resolveChartOptions(visual, 'heatmap', false)
  spec.legends = opt.legend
    ? {
        visible: true,
        type: 'color',
        orient: opt.legendPosition,
        position: 'middle',
        field: valueField,
      }
    : { visible: false }
  return spec
}

function buildHeatmapSpec(
  rows: Record<string, any>[],
  xField: string,
  yField: string,
  valueField: string,
  visual: VisVisualConfig | undefined,
  query: VIS.QueryConfig,
): ISpec | null {
  const values = dropBlankDimRows(rows, xField, yField)
  if (!values.length)
    return null
  return asSpec(applyHeatmapColor(
    applyChartLook({
      type: 'heatmap',
      background: 'transparent',
      data: chartData(values),
      xField,
      yField,
      valueField,
      cell: {
        style: {
          fill: { field: valueField, scale: 'color' },
          stroke: '#fff',
          lineWidth: 1,
        },
      },
      axes: [heatmapBandAxis('bottom'), heatmapBandAxis('left')],
      label: { smartInvert: true },
      tooltip: heatmapTooltipSpec(xField, yField, valueField, visual, query),
    }, visual, 'heatmap', query),
    visual,
    valueField,
  ))
}

const TORNADO_LEFT = '__vis_tornado_left'
const TORNADO_RIGHT = '__vis_tornado_right'

function absTick(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.abs(n) : value
}

function buildWaterfallSpec(
  rows: Record<string, any>[],
  xField: string,
  yField: string,
  visual: VisVisualConfig | undefined,
  query: VIS.QueryConfig,
): ISpec | null {
  const values = dropBlankDimRows(rows, xField)
  if (!values.length)
    return null
  const opt = resolveChartOptions(visual, 'waterfall', true)
  const horizontal = isHorizontalBar('waterfall', opt.orientation)
  const spec: Record<string, unknown> = {
    type: 'waterfall',
    background: 'transparent',
    data: chartData(values),
    xField: horizontal ? yField : xField,
    yField: horizontal ? xField : yField,
    // seriesFieldName 是主题字段，写在 spec 上不生效，图例会一直是 increase/decrease/total
    theme: {
      series: {
        waterfall: {
          seriesFieldName: {
            increase: '增加',
            decrease: '减少',
            total: '合计',
          },
        },
      },
    },
    // VChart 省略 total 或 type=end 都会 waterfallFillTotal 追加末项。
    // 关掉时用永不命中的 tagField，既不补柱也不把最后一类当合计。
    total: visual?.chart?.waterfallTotal === false
      ? { type: 'field', tagField: '__vis_waterfall_total' }
      : { type: 'end', text: '合计' },
    stackLabel: { visible: false },
    tooltip: metricTooltipSpec(xField, yField, visual, query),
    axes: cartesianAxes(true, horizontal),
  }
  if (horizontal)
    spec.direction = 'horizontal'
  return asSpec(applyChartLook(spec, visual, 'waterfall', query))
}

function buildTornadoSpec(
  rows: Record<string, any>[],
  xField: string,
  leftField: string,
  rightField: string,
  visual: VisVisualConfig | undefined,
  query: VIS.QueryConfig,
): ISpec | null {
  const chartRows = dropBlankDimRows(rows, xField)
  if (!chartRows.length)
    return null
  let max = 0
  const values = chartRows.map((row) => {
    const left = Number(row[leftField])
    const right = Number(row[rightField])
    const leftAbs = Number.isFinite(left) ? Math.abs(left) : 0
    const rightAbs = Number.isFinite(right) ? Math.abs(right) : 0
    max = Math.max(max, leftAbs, rightAbs)
    return {
      [xField]: row[xField],
      [leftField]: left,
      [rightField]: right,
      [TORNADO_LEFT]: -leftAbs,
      [TORNADO_RIGHT]: rightAbs,
    }
  })
  if (max <= 0)
    max = 1
  const opt = resolveChartOptions(visual, 'tornado', true)
  function valueLabel(field: string) {
    return {
      visible: opt.dataLabel,
      formatMethod: (_text: unknown, datum?: Record<string, unknown>) => {
        const n = Number(datum?.[field])
        return Number.isFinite(n)
          ? formatChartNumber(visual, query, field, Math.abs(n))
          : absTick(datum?.[field])
      },
    }
  }
  return asSpec(applyChartLook({
    type: 'common',
    background: 'transparent',
    data: [{ id: DATA_ID, values }],
    series: [
      {
        id: 'visTornadoLeft',
        type: 'bar',
        dataId: DATA_ID,
        direction: 'horizontal',
        xField: TORNADO_LEFT,
        yField: xField,
        name: leftField,
        label: valueLabel(leftField),
      },
      {
        id: 'visTornadoRight',
        type: 'bar',
        dataId: DATA_ID,
        direction: 'horizontal',
        xField: TORNADO_RIGHT,
        yField: xField,
        name: rightField,
        label: valueLabel(rightField),
      },
    ],
    tooltip: {
      mark: {
        title: { value: (datum: Record<string, unknown>) => datum?.[xField] },
        content: [
          {
            key: leftField,
            value: (datum: Record<string, unknown>) => {
              const n = Number(datum?.[leftField])
              return Number.isFinite(n)
                ? formatChartNumber(visual, query, leftField, Math.abs(n))
                : absTick(datum?.[leftField])
            },
          },
          {
            key: rightField,
            value: (datum: Record<string, unknown>) => {
              const n = Number(datum?.[rightField])
              return Number.isFinite(n)
                ? formatChartNumber(visual, query, rightField, Math.abs(n))
                : absTick(datum?.[rightField])
            },
          },
        ],
      },
    },
    axes: [
      { orient: 'left', type: 'band', title: { visible: false } },
      {
        orient: 'bottom',
        type: 'linear',
        min: -max,
        max,
        title: { visible: false },
        label: {
          formatMethod: (text: string | string[]) => {
            const raw = Array.isArray(text) ? text[0] : text
            const n = Number(raw)
            if (!Number.isFinite(n))
              return text
            return formatChartNumber(visual, query, leftField, Math.abs(n))
          },
        },
      },
    ],
  }, visual, 'tornado', query))
}

/** vis 几何图 → VChart spec；字段不齐或无行时返回 null */
export function buildVChartSpec(
  chartType: string,
  query: VIS.QueryConfig,
  data: VIS.QueryDataResponse,
  visual?: VisVisualConfig,
): ISpec | null {
  const rows = data.rows ?? []
  if (!rows.length)
    return null

  const type = String(chartType || 'table').toLowerCase()
  const dims = query.dimensions ?? []
  const metrics = chartMetrics(query.metrics ?? [])
  const xField = dims[0] ? dimensionAlias(dims[0]) : undefined
  const yField = metrics[0] ? metricAlias(metrics[0]) : undefined
  const seriesField = dims[1] ? dimensionAlias(dims[1]) : undefined

  if (type === 'bar' || type === 'line') {
    if (!xField)
      return null
    return buildCartesianSpec(type, rows, xField, metrics, seriesField, visual, query)
  }

  if (type === 'combo') {
    if (!xField)
      return null
    const yFields = metrics.map(metricAlias).filter(Boolean)
    if (yFields.length < 2)
      return null
    const opt = resolveChartOptions(visual, type, true)
    return buildComboSpec(rows, xField, yFields, visual, query, opt)
  }

  if (type === 'waterfall') {
    if (!xField || !yField)
      return null
    return buildWaterfallSpec(rows, xField, yField, visual, query)
  }

  if (type === 'tornado') {
    const left = metrics[0] ? metricAlias(metrics[0]) : undefined
    const right = metrics[1] ? metricAlias(metrics[1]) : undefined
    if (!xField || !left || !right)
      return null
    return buildTornadoSpec(rows, xField, left, right, visual, query)
  }

  if (type === 'pie') {
    if (!xField || !yField)
      return null
    const opt = resolveChartOptions(visual, type, true)
    const total = pieShareOfRows(rows, yField)
    return asSpec(applyValueGradient(
      applyChartLook({
        type: 'pie',
        background: 'transparent',
        data: chartData(rows),
        categoryField: xField,
        valueField: yField,
        outerRadius: 0.8,
        pie: pieMarkSpec(),
        ...(opt.donut ? { innerRadius: 0.5, padAngle: 0.6 } : {}),
        ...(opt.donut && opt.centerText ? { indicator: pieIndicatorSpec(xField, yField, total, visual, query) } : {}),
        label: pieLabelSpec(xField, yField, total, visual, query),
        tooltip: pieTooltipSpec(xField, yField, total, visual, query),
      }, visual, type, query),
      visual,
      type,
      rows,
      xField,
      yField,
    ))
  }

  if (type === 'scatter') {
    const x = metrics[0] ? metricAlias(metrics[0]) : undefined
    const y = metrics[1] ? metricAlias(metrics[1]) : undefined
    if (!x || !y)
      return null
    return asSpec(applyChartLook({
      type: 'scatter',
      background: 'transparent',
      data: chartData(rows),
      xField: x,
      yField: y,
      size: 8,
      ...(xField ? { seriesField: xField } : { name: y }),
      axes: cartesianAxes(),
    }, visual, type, query))
  }

  if (type === 'radar') {
    if (!xField)
      return null
    const yFields = metrics.map(metricAlias).filter(Boolean)
    if (!yFields.length)
      return null
    const multiMetric = yFields.length > 1
    const y = multiMetric ? SERIES_VALUE : yFields[0]
    const series = multiMetric ? SERIES_KEY : seriesField
    const opt = resolveChartOptions(visual, type, !!series)
    return asSpec(applyChartLook({
      type: 'radar',
      background: 'transparent',
      data: chartData(multiMetric ? foldMetricRows(rows, xField, yFields) : rows),
      categoryField: xField,
      valueField: y,
      ...(series
        ? { seriesField: series, tooltip: cartesianSeriesTooltipSpec(xField, series, y, visual, query) }
        : { name: y, tooltip: metricTooltipSpec(xField, y, visual, query) }),
      area: { visible: opt.area },
    }, visual, type, query))
  }

  if (type === 'wordcloud') {
    if (!xField || !yField)
      return null
    const opt = resolveChartOptions(visual, type, true)
    return asSpec(applyValueGradient(
      applyChartLook({
        type: 'wordCloud',
        background: 'transparent',
        data: chartData(rows),
        nameField: xField,
        valueField: yField,
        seriesField: xField,
        colorMode: 'ordinal',
        ...(opt.randomRotate ? { rotateAngles: [0, 90] } : {}),
        ...(opt.shapeText
          ? {
              maskShape: {
                type: 'text',
                text: opt.shapeText,
                fill: '#eee',
                fontWeight: 'bold',
              },
              wordMask: { visible: true },
            }
          : {}),
        tooltip: {
          mark: {
            title: {
              value: (datum: Record<string, unknown>) => datum?.[xField],
            },
            content: [{
              key: yField,
              value: (datum: Record<string, unknown>) => formatChartNumber(visual, query, yField, datum?.[yField]),
            }],
          },
        },
      }, visual, type, query),
      visual,
      type,
      rows,
      xField,
      yField,
    ))
  }

  if (type === 'treemap') {
    if (!yField)
      return null
    const dimFields = dims.map(dimensionAlias).filter(Boolean)
    if (!dimFields.length)
      return null
    return buildTreemapSpec(rows, dimFields, yField, visual, query)
  }

  if (type === 'heatmap') {
    if (!xField || !seriesField || !yField)
      return null
    return buildHeatmapSpec(rows, xField, seriesField, yField, visual, query)
  }

  if (type === 'funnel') {
    if (!xField || !yField)
      return null
    const opt = resolveChartOptions(visual, type, false)
    return asSpec(applyChartLook({
      type: 'funnel',
      background: 'transparent',
      data: chartData(rows),
      categoryField: xField,
      valueField: yField,
      tooltip: metricTooltipSpec(xField, yField, visual, query),
      ...(opt.showRate
        ? {
            isTransform: true,
            transformLabel: { visible: true },
          }
        : {}),
    }, visual, type, query))
  }

  return null
}
