import type { DashLayoutRect } from './dashLayout'
import { DASH_COL_NUM, DASH_MARGIN, DASH_ROW_HEIGHT } from './config'

export type DashGuideItem = DashLayoutRect & { i: string | number }

export interface DashGuideBounds {
  left: number
  top: number
  width: number
  height: number
}

export interface DashAlignmentGuide {
  axis: 'x' | 'y'
  position: number
  start: number
  end: number
}

export const DASH_GUIDE_LABEL = { height: 24, gap: 8, inset: 4 } as const

/** 与 GridLayout 的 offsetWidth / GridItem 的逐项取整方式一致，包含两端外边距。 */
export function dashGridGeometry(containerWidth: number) {
  const width = Math.round(containerWidth)
  const [gapX, gapY] = DASH_MARGIN
  if (!Number.isFinite(width) || width <= gapX * (DASH_COL_NUM + 1))
    return null
  const columnWidth = (width - gapX * (DASH_COL_NUM + 1)) / DASH_COL_NUM
  return {
    width,
    rowStep: DASH_ROW_HEIGHT + gapY,
    columns: Array.from({ length: DASH_COL_NUM }, (_, x) => ({
      start: Math.round(columnWidth * x + (x + 1) * gapX),
      end: Math.round(columnWidth * (x + 1) + (x + 1) * gapX),
    })),
    rect: ({ x, y, w, h }: DashLayoutRect) => ({
      left: Math.round(columnWidth * x + (x + 1) * gapX),
      top: Math.round(DASH_ROW_HEIGHT * y + (y + 1) * gapY),
      width: Math.round(columnWidth * w + Math.max(0, w - 1) * gapX),
      height: Math.round(DASH_ROW_HEIGHT * h + Math.max(0, h - 1) * gapY),
    }),
  }
}

/** 对齐提示只比较同层卡片的实际像素边界，不把栅格间隙误当成对齐。 */
export function dashAlignmentGuides(
  containerWidth: number,
  active: DashGuideItem,
  items: readonly DashGuideItem[],
): DashAlignmentGuide[] {
  const geometry = dashGridGeometry(containerWidth)
  if (!geometry)
    return []
  const bounds = geometry.rect(active)
  const peers = items.filter(item => String(item.i) !== String(active.i)).map(geometry.rect)
  const result: DashAlignmentGuide[] = []
  for (const axis of ['x', 'y'] as const) {
    const positionKey = axis === 'x' ? 'left' : 'top'
    const sizeKey = axis === 'x' ? 'width' : 'height'
    const spanKey = axis === 'x' ? 'top' : 'left'
    const spanSizeKey = axis === 'x' ? 'height' : 'width'
    function findGuide(ratio: number): DashAlignmentGuide | undefined {
      const position = bounds[positionKey] + bounds[sizeKey] * ratio
      const aligned = peers.filter(peer => Math.abs(peer[positionKey] + peer[sizeKey] * ratio - position) <= 1)
      if (!aligned.length)
        return undefined
      return {
        axis,
        position,
        start: Math.min(bounds[spanKey], ...aligned.map(peer => peer[spanKey])),
        end: Math.max(bounds[spanKey] + bounds[spanSizeKey], ...aligned.map(peer => peer[spanKey] + peer[spanSizeKey])),
      }
    }
    // 同尺寸卡片优先标两侧边缘，避免同时叠加中心线。
    const edges = [findGuide(0), findGuide(1)].filter((guide): guide is DashAlignmentGuide => !!guide)
    if (edges.length) {
      result.push(...edges)
    }
    else {
      const center = findGuide(0.5)
      if (center)
        result.push(center)
    }
  }
  return result
}

/** 固定在卡片左下角内侧，只在画布边缘做防溢出调整。 */
export function dashGuideLabelPosition(bounds: DashGuideBounds, width: number, height: number, labelWidth: number) {
  const { height: labelHeight, gap, inset } = DASH_GUIDE_LABEL
  return {
    left: Math.max(inset, Math.min(bounds.left + gap, width - labelWidth - inset)),
    top: Math.max(inset, Math.min(bounds.top + bounds.height - labelHeight - gap, height - labelHeight - inset)),
  }
}
