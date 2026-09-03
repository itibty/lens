import type { VisChartThemeId, VisVisualConfig } from './types'
import { isHeatmapChart } from './types'

export const DEFAULT_CHART_THEME: VisChartThemeId = 'DEFAULT'

/** 饼图 / 词云冷 / 暖渐变色带；按名次均分，不按数值线性映射 */
export const PIE_COLD_GRADIENT_RANGE = ['#0E4FE0', '#1664FF', '#4B8AFF', '#7EABFF', '#B2CFFF', '#D9E7FF']
export const PIE_WARM_GRADIENT_RANGE = ['#B42318', '#E04B2A', '#F97316', '#FB923C', '#FDBA74', '#FFE4C8']
const VALUE_GRADIENT_IDS = new Set<VisChartThemeId>(['GRADIENT', 'WARM_GRADIENT'])
const VALUE_GRADIENT_CHARTS = new Set(['pie', 'wordcloud', 'treemap'])

export interface ChartPalettePreset {
  id: VisChartThemeId
  palette: string[]
  label: string
}

/** 热力图连续色带：低浅高深。默认品牌蓝；冷走青、暖走橙，三档色相分开。 */
export const HEATMAP_COLOR_PRESETS: ChartPalettePreset[] = [
  {
    id: 'DEFAULT',
    label: '默认',
    palette: ['#D9E7FF', '#0052D9'],
  },
  {
    id: 'GRADIENT',
    label: '冷渐变',
    palette: ['#E6F7FB', '#9BD8E8', '#3AA8C5', '#0E7490', '#155E75'],
  },
  {
    id: 'WARM_GRADIENT',
    label: '暖渐变',
    palette: [...PIE_WARM_GRADIENT_RANGE].reverse(),
  },
]

function pieGradientStops(id: VisChartThemeId) {
  return id === 'WARM_GRADIENT' ? PIE_WARM_GRADIENT_RANGE : PIE_COLD_GRADIENT_RANGE
}

function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace('#', '')
  const n = Number.parseInt(raw.length === 3
    ? raw.split('').map(ch => ch + ch).join('')
    : raw, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function mixHex(from: string, to: string, t: number) {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  return rgbToHex(
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  )
}

function sampleGradient(stops: string[], t: number) {
  if (stops.length === 1)
    return stops[0]
  const clamped = Math.min(1, Math.max(0, t))
  const pos = clamped * (stops.length - 1)
  const index = Math.min(Math.floor(pos), stops.length - 2)
  return mixHex(stops[index], stops[index + 1], pos - index)
}

/** 按指标从大到小均分色带；domain / range 与行顺序对齐，图例可直接跟色 */
export function pieGradientOrdinal(
  rows: Record<string, unknown>[],
  categoryField: string,
  valueField: string,
  themeId: VisChartThemeId = 'GRADIENT',
) {
  const stops = pieGradientStops(themeId)
  const ranked = rows
    .map((row, index) => ({ row, index, value: Number(row[valueField]) || 0 }))
    .sort((a, b) => b.value - a.value || a.index - b.index)
  const last = Math.max(ranked.length - 1, 1)
  const colorByIndex = new Map(ranked.map((item, rank) => [
    item.index,
    sampleGradient(stops, rank / last),
  ]))
  return {
    domain: rows.map(row => row[categoryField]),
    range: rows.map((_, index) => colorByIndex.get(index) || stops[0]),
  }
}

/**
 * 几何图系列色。
 * DEFAULT 使用品牌主色开头的默认系列色。
 * CONTRAST = Tableau 10 前 8 色；COLORBLIND = Okabe-Ito（不含黑）。
 * GRADIENT / WARM_GRADIENT 仅饼图 / 词云 / 矩形树图：按名次均分色带。热力图用 HEATMAP_COLOR_PRESETS。
 */
export const CHART_SERIES_PALETTES: ChartPalettePreset[] = [
  {
    id: 'DEFAULT',
    label: '默认',
    palette: ['#0052D9', '#319CC5', '#E98A18', '#36A36E', '#725BC2', '#C79B18', '#496A8F', '#9A7BC6'],
  },
  {
    id: 'GRADIENT',
    label: '冷渐变',
    palette: PIE_COLD_GRADIENT_RANGE,
  },
  {
    id: 'WARM_GRADIENT',
    label: '暖渐变',
    palette: PIE_WARM_GRADIENT_RANGE,
  },
  {
    id: 'CONTRAST',
    label: '高对比',
    palette: ['#4E79A7', '#F28E2B', '#E15759', '#76B7B2', '#59A14F', '#EDC948', '#B07AA1', '#FF9DA7'],
  },
  {
    id: 'COLORBLIND',
    label: '易辨色',
    palette: ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7'],
  },
]

export function supportsValueGradient(chartType?: string) {
  return VALUE_GRADIENT_CHARTS.has(String(chartType || '').toLowerCase())
}

export function chartSeriesPalettes(chartType?: string) {
  if (isHeatmapChart(chartType))
    return HEATMAP_COLOR_PRESETS
  if (supportsValueGradient(chartType))
    return CHART_SERIES_PALETTES
  return CHART_SERIES_PALETTES.filter(item => !VALUE_GRADIENT_IDS.has(item.id))
}

/** 选择器画连续色带，而不是一块块系列色 */
export function showsPaletteAsGradient(chartType?: string, id?: VisChartThemeId) {
  return isHeatmapChart(chartType) || isValueGradientId(id)
}

export function allowsChartTheme(chartType?: string, id?: VisChartThemeId) {
  return !!id && chartSeriesPalettes(chartType).some(item => item.id === id)
}

const SERIES_MAP = Object.fromEntries(
  CHART_SERIES_PALETTES.map(item => [item.id, item.palette]),
) as Record<VisChartThemeId, string[]>

export function resolveChartThemeId(visual?: Pick<VisVisualConfig, 'chartTheme'>): VisChartThemeId {
  const id = visual?.chartTheme
  if (id && id in SERIES_MAP)
    return id
  return DEFAULT_CHART_THEME
}

export function isValueGradientId(id?: VisChartThemeId) {
  return !!id && VALUE_GRADIENT_IDS.has(id)
}

export function isValueGradientTheme(visual?: Pick<VisVisualConfig, 'chartTheme'>, chartType?: string) {
  return supportsValueGradient(chartType) && isValueGradientId(resolveChartThemeId(visual))
}

/** 热力图色带：与预设预览同一条 range。 */
export function resolveHeatmapColorRange(visual?: Pick<VisVisualConfig, 'chartTheme'>): string[] {
  const id = resolveChartThemeId(visual)
  return HEATMAP_COLOR_PRESETS.find(item => item.id === id)?.palette
    ?? HEATMAP_COLOR_PRESETS[0].palette
}

/** 名次渐变返回 undefined；饼图 / 词云按名次写 ordinal。 */
export function resolveChartSeriesColors(visual?: Pick<VisVisualConfig, 'chartTheme'>): string[] | undefined {
  const id = resolveChartThemeId(visual)
  if (VALUE_GRADIENT_IDS.has(id))
    return undefined
  return SERIES_MAP[id]
}
