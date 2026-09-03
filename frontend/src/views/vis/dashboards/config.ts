/**
 * 看板布局 / 页面壳常量。
 * 预览页左右留白与 DASH_MARGIN / dashPage 的格子间距一致。
 */
export { VIS_DASHBOARD_CONF as FUNCTION_DASHBOARD_CONF } from '@/core/permCodes'

export const DASH_COL_NUM = 24
export const DASH_ROW_HEIGHT = 28
/** 未识别类型 / 移出分组时的兜底，约 1/3 */
export const DASH_DEFAULT_W = 8
export const DASH_DEFAULT_H = 10
export const DASH_MIN_W = 4
export const DASH_MIN_H = 4

/** 看板原生文本标注；内容随看板保存，不进入卡片库。 */
export const DASH_TEXT_DEFAULT_W = 24
export const DASH_TEXT_DEFAULT_H = 4
export const DASH_TEXT_MIN_W = 4
export const DASH_TEXT_MIN_H = 2
export const DASH_TEXT_HTML_MAX_LENGTH = 20_000

/** 新加入看板上的默认格子。24 列：指标 1/6，排行 1/4，图 1/3，表 1/2。 */
export function dashCardDefaultSize(chartType?: string): { w: number, h: number } {
  switch (String(chartType || '').toLowerCase()) {
    case 'number':
    case 'progress':
    case 'trend':
      return { w: 4, h: 5 }
    case 'kpi':
      return { w: 8, h: 6 }
    case 'rank':
      return { w: 6, h: 10 }
    case 'table':
    case 'pivot':
      return { w: 12, h: 10 }
    case 'richtext':
    case 'url':
      return { w: 8, h: 6 }
    case 'pie':
    case 'funnel':
    case 'radar':
    case 'wordcloud':
    case 'scatter':
      return { w: 8, h: 8 }
    case 'bar':
    case 'line':
    case 'combo':
    case 'waterfall':
    case 'tornado':
    case 'heatmap':
    case 'treemap':
      return { w: 8, h: 10 }
    default:
      return { w: DASH_DEFAULT_W, h: DASH_DEFAULT_H }
  }
}
export const DASH_GROUP_DEFAULT_W = 24
export const DASH_GROUP_DEFAULT_H = 16
export const DASH_GROUP_MIN_W = 8
export const DASH_GROUP_MIN_H = 4
/** 格子间距；grid-layout-plus 同时用作容器外边距。分组体内边距跟这个对齐。 */
export const DASH_MARGIN = [12, 12] as [number, number]
/** 预览窄屏叠成一列；设计页不启用，避免重排写回 widgets */
export const DASH_STACK_MAX_WIDTH = 768

/** 预览页根节点，卡片全屏 Teleport 到这里 */
export const DASH_VIEWER_ID = 'vis-dash-viewer'
/** 设计页根节点，截屏用 */
export const DASH_DESIGNER_ID = 'vis-dash-designer'
