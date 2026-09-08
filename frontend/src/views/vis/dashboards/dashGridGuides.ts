import type { DashLayoutRect } from './dashLayout'
import { DASH_COL_NUM, DASH_MARGIN, DASH_ROW_HEIGHT } from './config'

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
