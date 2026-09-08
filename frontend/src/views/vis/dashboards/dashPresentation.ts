import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type { DashLayoutRect, DashPageItem, DashWidget } from './dashLayout'
import { widgetKey } from './dashLayout'

/**
 * 看板展示布局。auto 保留通用页面原有的窄屏堆叠行为；其余模式由独立预览页明确选择。
 */
export type DashPresentationMode = 'auto' | 'compact' | 'medium' | 'wide'
export type DashFlowMode = Extract<DashPresentationMode, 'compact' | 'medium'>

export const DASH_PRESENTATION_MODE_KEY: InjectionKey<ComputedRef<DashPresentationMode>>
  = Symbol('dash-presentation-mode')
export const DASH_EAGER_CARD_QUERIES_KEY: InjectionKey<Readonly<Ref<boolean>>>
  = Symbol('dash-eager-card-queries')

export interface DashFlowWidgetProjection {
  key: string
  widget: DashWidget
  columnSpan: 1 | 2
  height?: number
  minHeight?: number
}

export interface DashFlowCardProjection {
  item: DashPageItem
  columnSpan: 1 | 2
  height: number
}

const LIGHTWEIGHT_CHART_TYPES = new Set(['number', 'progress', 'trend'])

/** 独立预览使用容器宽度选择展示模式；嵌入式场景继续沿用 auto。 */
export function resolveDashPresentationMode(width: number, standalone: boolean): DashPresentationMode {
  if (!standalone)
    return 'auto'
  const safeWidth = Number.isFinite(width) ? Math.max(0, width) : 0
  if (safeWidth < 600)
    return 'compact'
  if (safeWidth < 1024)
    return 'medium'
  return 'wide'
}

export function isDashFlowMode(mode: DashPresentationMode): mode is DashFlowMode {
  return mode === 'compact' || mode === 'medium'
}

/** 只在独立预览的流式展示里延迟查询；设计态和通用嵌入页保持原行为。 */
export function shouldDeferDashCardQuery(mode: DashPresentationMode, editable: boolean): boolean {
  return !editable && isDashFlowMode(mode)
}

/** 位置相同的节点保持配置里的原始顺序，避免移动投影在重渲染时跳动。 */
export function sortByDashPosition<T extends Pick<DashLayoutRect, 'x' | 'y'>>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.y - b.item.y || a.item.x - b.item.x || a.index - b.index)
    .map(({ item }) => item)
}

export function isLightweightDashCard(chartType?: string): boolean {
  return LIGHTWEIGHT_CHART_TYPES.has(String(chartType || '').trim().toLowerCase())
}

/**
 * 流式布局使用稳定的产品高度，而不是照搬桌面栅格的 h。
 * 表格留出更多纵向浏览空间，指标类则保持紧凑。
 */
export function dashFlowCardHeight(chartType?: string, mode: DashFlowMode = 'medium'): number {
  switch (String(chartType || '').trim().toLowerCase()) {
    case 'number':
      return mode === 'compact' ? 156 : 176
    case 'progress':
      return mode === 'compact' ? 172 : 196
    case 'trend':
      return mode === 'compact' ? 196 : 220
    case 'kpi':
    case 'richtext':
      return 260
    case 'rank':
      return 340
    case 'url':
      return 360
    case 'table':
    case 'pivot':
      return 420
    default:
      return mode === 'compact' ? 296 : 320
  }
}

export function dashFlowColumnSpan(mode: DashFlowMode, chartType?: string): 1 | 2 {
  const simpleMetric = String(chartType || '').trim().toLowerCase() === 'number'
  return (mode === 'compact' ? simpleMetric : isLightweightDashCard(chartType)) ? 1 : 2
}

// 只配对相邻指标，保持阅读顺序；落单指标铺满一行，避免图表前留下半行空白。
function pairCompactMetrics<T extends { columnSpan: 1 | 2 }>(items: T[], mode: DashFlowMode): T[] {
  if (mode !== 'compact')
    return items
  for (let index = 0; index < items.length; index++) {
    const item = items[index]!
    if (item.columnSpan !== 1)
      continue
    if (items[index + 1]?.columnSpan === 1)
      index++
    else
      item.columnSpan = 2
  }
  return items
}

export function projectDashFlowWidgets(
  widgets: readonly DashWidget[],
  mode: DashFlowMode,
  chartTypeOf: (cardId: string) => string | undefined,
): DashFlowWidgetProjection[] {
  return pairCompactMetrics(sortByDashPosition(widgets).map((widget): DashFlowWidgetProjection => {
    if (widget.kind === 'card') {
      const chartType = chartTypeOf(widget.cardId)
      return {
        key: widgetKey(widget),
        widget,
        columnSpan: dashFlowColumnSpan(mode, chartType),
        height: dashFlowCardHeight(chartType, mode),
      }
    }
    if (widget.kind === 'text') {
      return {
        key: widgetKey(widget),
        widget,
        columnSpan: 2,
        minHeight: mode === 'compact' ? 96 : 120,
      }
    }
    return {
      key: widgetKey(widget),
      widget,
      columnSpan: 2,
      ...(widget.mode === 'tabs' ? { height: mode === 'compact' ? 380 : 420 } : { minHeight: 160 }),
    }
  }), mode)
}

export function projectDashFlowCards(
  items: readonly DashPageItem[],
  mode: DashFlowMode,
  chartTypeOf: (cardId: string) => string | undefined,
): DashFlowCardProjection[] {
  return pairCompactMetrics(sortByDashPosition(items).map(item => ({
    item,
    columnSpan: dashFlowColumnSpan(mode, chartTypeOf(item.cardId)),
    height: dashFlowCardHeight(chartTypeOf(item.cardId), mode),
  })), mode)
}
