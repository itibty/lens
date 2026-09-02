import type { VisPivotPlace, VisTableStyle, VisVisualConfig } from '@/views/vis/shared/types'

export const TABLE_STYLE_DEFAULTS = {
  sortable: true,
  showFilter: false,
  striped: false,
  showRowNumber: false,
  mergeCell: false,
  treeDisplay: false,
  sortColumn: false,
} as const satisfies Pick<Required<VisTableStyle>, 'sortable' | 'showFilter' | 'striped' | 'showRowNumber' | 'mergeCell' | 'treeDisplay' | 'sortColumn'>

export const TABLE_FEATURE_TIPS = {
  showFilter: '按取值或条件筛选当前结果，不是数据集筛选',
  mergeCell: '同一列相邻相同值合并为一格',
  treeDisplay: '行维收成一列，分组值显示在父行',
  rowSubtotal: '按行维分组汇总，需 2 个及以上行维',
  columnSubtotal: '按列维分组汇总，需 2 个及以上列维',
} as const

export type ResolvedTableStyle = Pick<Required<VisTableStyle>, 'sortable' | 'showFilter' | 'striped' | 'showRowNumber' | 'mergeCell' | 'treeDisplay' | 'sortColumn'>

export function resolveTableStyle(visual?: VisVisualConfig): ResolvedTableStyle {
  const raw = visual?.table ?? {}
  return {
    sortable: raw.sortable ?? TABLE_STYLE_DEFAULTS.sortable,
    showFilter: raw.showFilter ?? TABLE_STYLE_DEFAULTS.showFilter,
    striped: raw.striped ?? TABLE_STYLE_DEFAULTS.striped,
    showRowNumber: raw.showRowNumber ?? TABLE_STYLE_DEFAULTS.showRowNumber,
    mergeCell: raw.mergeCell ?? TABLE_STYLE_DEFAULTS.mergeCell,
    treeDisplay: raw.treeDisplay ?? TABLE_STYLE_DEFAULTS.treeDisplay,
    sortColumn: raw.sortColumn ?? TABLE_STYLE_DEFAULTS.sortColumn,
  }
}

/** 透视树形；未配置时关闭 */
export function resolvePivotTreeDisplay(visual?: VisVisualConfig): boolean {
  return visual?.table?.treeDisplay ?? TABLE_STYLE_DEFAULTS.treeDisplay
}

export const PIVOT_PLACE_DEFAULT: VisPivotPlace = 'end'

export function resolvePivotPlaces(visual?: VisVisualConfig) {
  const raw = visual?.table ?? {}
  return {
    rowTotal: raw.rowTotalPlace ?? PIVOT_PLACE_DEFAULT,
    columnTotal: raw.columnTotalPlace ?? PIVOT_PLACE_DEFAULT,
    rowSubtotal: raw.rowSubtotalPlace ?? PIVOT_PLACE_DEFAULT,
    columnSubtotal: raw.columnSubtotalPlace ?? PIVOT_PLACE_DEFAULT,
  }
}
