/** 矩形树图节点字段；明细回填与 spec 共用 */
export const TREE_NAME = 'name'
export const TREE_VALUE = 'value'
export const TREE_CHILDREN = 'children'
export const TREE_LABEL = '__vis_label'
export const TREE_PATH_SEP = ' / '

export function joinTreePath(parent: string, label: string) {
  return parent ? `${parent}${TREE_PATH_SEP}${label}` : label
}

/** VChart 点击可能是路径数组，或把原始行挂在 data 上 */
export function unwrapChartDatum(datum: unknown): Record<string, unknown> | undefined {
  if (!datum || typeof datum !== 'object')
    return undefined
  if (Array.isArray(datum)) {
    for (let i = datum.length - 1; i >= 0; i--) {
      const item = unwrapChartDatum(datum[i])
      if (item)
        return item
    }
    return undefined
  }
  const rec = datum as Record<string, unknown>
  const nested = rec.data
  if (nested && typeof nested === 'object' && !Array.isArray(nested))
    return { ...rec, ...(nested as Record<string, unknown>) }
  return rec
}
