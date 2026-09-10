import type { TYPES } from '@visactor/vtable'
import type { VisChartThemeId, VisVisualConfig } from './types'
import type { ThemeColors } from '@/theme/tokens'
import { themes } from '@visactor/vtable'
import { FONT_SANS } from '@/core/fonts'
import { alphaColor, LIGHT_THEME } from '@/theme/tokens'
import { resolveChartThemeId } from './chartPalette'
import { VIS_EMPTY_TEXT } from './emptyState'
import { resolveTableStyle } from './tableStyle'

type ITableThemeDefine = TYPES.ITableThemeDefine

const CELL_FONT_SIZE = 13
const BODY_BG = LIGHT_THEME.surface.panel
const DEFAULT_STRIPE = LIGHT_THEME.surface.faint

/** 表格 / 透视共用画布与行高 */
export const VTABLE_LAYOUT = {
  widthMode: 'standard',
  autoFillWidth: true,
  containerFit: { width: true, height: false },
  overscrollBehavior: 'none',
  defaultRowHeight: 32,
  defaultHeaderRowHeight: 32,
} as const

/** 选区复制（Ctrl/Cmd+C）；Ctrl/Cmd+A 全选后再复制 */
export const VTABLE_KEYBOARD = {
  copySelected: true,
  selectAllOnCtrlA: true,
} as const

/** 无 records 时外框跟画布走，包住空表体；有数据仍只包内容，避免短表被拉高 */
export function resolveVTableLayout(emptyBody = false) {
  return {
    ...VTABLE_LAYOUT,
    keyboardOptions: { ...VTABLE_KEYBOARD },
    containerFit: {
      width: true,
      height: emptyBody,
    },
  }
}

/** 官方 emptyTip：无 records 时保留表头，表体提示 */
export const VTABLE_EMPTY_TEXT = VIS_EMPTY_TEXT

export const VTABLE_EMPTY_TIP = {
  text: VTABLE_EMPTY_TEXT,
  displayMode: 'basedOnTable',
  spaceBetweenTextAndIcon: 0,
  textStyle: {
    fontSize: 13,
    fontFamily: FONT_SANS,
    color: LIGHT_THEME.text.muted,
  },
  icon: {
    width: 0,
    height: 0,
    image: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
  },
} as const

export function resolveVTableEmptyTip(theme: ThemeColors = LIGHT_THEME) {
  return {
    ...VTABLE_EMPTY_TIP,
    textStyle: {
      ...VTABLE_EMPTY_TIP.textStyle,
      color: theme.text.disabled,
    },
  }
}

type TableChrome = {
  headerBg: string
  headerColor: string
  /** 表头 hover / 交叉高亮，需深于 headerBg，保证白字可读 */
  headerHover: string
  headerHoverRow: string
  headerSelect: string
  bodyColor: string
  border: string
  hover: string
  hoverRow: string
  accent: string
  accentSoft: string
  selection: string
  stripeOdd: string
}

const DEFAULT_HEADER_BG = LIGHT_THEME.surface.subtle
const DEFAULT_BODY_COLOR = LIGHT_THEME.text.strong

function tableChrome(theme: ThemeColors): TableChrome {
  return {
    headerBg: theme.surface.subtle,
    headerColor: theme.text.strong,
    headerHover: theme.primary.soft,
    headerHoverRow: theme.surface.hover,
    headerSelect: theme.primary.soft,
    bodyColor: theme.text.strong,
    border: theme.border.light,
    hover: theme.primary.soft,
    hoverRow: theme.surface.faint,
    accent: theme.primary.base,
    accentSoft: theme.primary.soft,
    selection: alphaColor(theme.primary.base, 0.12),
    stripeOdd: theme.surface.faint,
  }
}

/** 显式色板保留；默认和暗色表面共用公共语义适配。 */
const TABLE_CHROME: Partial<Record<VisChartThemeId, TableChrome>> = {
  CONTRAST: {
    headerBg: '#4E79A7',
    headerColor: '#FFFFFF',
    headerHover: '#35597C',
    headerHoverRow: '#3E688E',
    headerSelect: '#2F4F70',
    bodyColor: '#1B1F23',
    border: '#9AAFC4',
    hover: '#D4E0EC',
    hoverRow: '#E8EEF4',
    accent: '#4E79A7',
    accentSoft: '#D6E2EE',
    selection: 'rgba(78, 121, 167, 0.16)',
    stripeOdd: '#E4EBF3',
  },
  COLORBLIND: {
    headerBg: '#0072B2',
    headerColor: '#FFFFFF',
    headerHover: '#005A8C',
    headerHoverRow: '#006399',
    headerSelect: '#004F7A',
    bodyColor: '#000000',
    border: '#56B4E9',
    hover: '#D9EEF8',
    hoverRow: '#E8F5FB',
    accent: '#0072B2',
    accentSoft: '#CDE6F4',
    selection: 'rgba(0, 114, 178, 0.16)',
    stripeOdd: '#FFF3CC',
  },
}

function previewPalette(chrome?: TableChrome) {
  if (!chrome)
    return [DEFAULT_HEADER_BG, DEFAULT_BODY_COLOR, BODY_BG, DEFAULT_STRIPE]
  return [chrome.headerBg, chrome.bodyColor, BODY_BG, chrome.stripeOdd]
}

/** 选择条：表头 / 字色 / 单元格 / 斑马纹 */
export const TABLE_COLOR_PRESETS: Array<{
  id: VisChartThemeId
  label: string
  palette: string[]
}> = [
  { id: 'DEFAULT', label: '默认', palette: previewPalette() },
  { id: 'CONTRAST', label: '高对比', palette: previewPalette(TABLE_CHROME.CONTRAST) },
  { id: 'COLORBLIND', label: '易辨色', palette: previewPalette(TABLE_CHROME.COLORBLIND) },
]

function stripeBg(odd: string, even = BODY_BG) {
  return (args: { row?: number, table?: { frozenRowCount?: number } }) => {
    const index = (args.row ?? 0) - (args.table?.frozenRowCount ?? 0)
    return index % 2 ? odd : even
  }
}

const BASE_FRAME = {
  borderLineWidth: 1,
  innerBorder: true,
  cornerRadius: 0,
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
} as const

const HEADER_FONT = { fontSize: CELL_FONT_SIZE, fontWeight: 600, fontFamily: FONT_SANS } as const

function resolveTableChrome(visual: VisVisualConfig | undefined, theme: ThemeColors) {
  const id = resolveChartThemeId(visual)
  // 高对比 / 易辨色等显式色板保持原有覆盖规则；默认表面跟随完整主题。
  return theme.mode === 'dark' || id === 'DEFAULT'
    ? tableChrome(theme)
    : TABLE_CHROME[id] ?? tableChrome(theme)
}

export function resolveTableHeaderIconColor(visual?: VisVisualConfig, theme: ThemeColors = LIGHT_THEME) {
  return resolveTableChrome(visual, theme).headerColor
}

/** 数据条轨道跟随所在表面，显式进度填充仍优先。 */
export function resolveVTableProgressTrackColor(theme: ThemeColors = LIGHT_THEME) {
  return theme.chart.track
}

/** 字体、表面、选区统一适配，显式图表色板仍优先。 */
export function resolveVTableTheme(visual?: VisVisualConfig, theme: ThemeColors = LIGHT_THEME): ITableThemeDefine {
  const striped = resolveTableStyle(visual).striped
  const chrome = resolveTableChrome(visual, theme)

  const headerHover = {
    cellBgColor: chrome.headerHover,
    inlineRowBgColor: chrome.headerHoverRow,
    inlineColumnBgColor: chrome.headerHoverRow,
  }
  const bodyHover = {
    cellBgColor: chrome.hover,
    inlineRowBgColor: chrome.hoverRow,
    inlineColumnBgColor: chrome.hoverRow,
  }
  const headerSelect = {
    cellBgColor: chrome.headerSelect,
    inlineRowBgColor: chrome.headerHoverRow,
    inlineColumnBgColor: chrome.headerHoverRow,
  }
  const header = {
    ...HEADER_FONT,
    bgColor: chrome.headerBg,
    color: chrome.headerColor,
    hover: headerHover,
    select: headerSelect,
  }

  return (theme.mode === 'dark' ? themes.DARK : themes.DEFAULT).extends({
    underlayBackgroundColor: 'transparent',
    defaultStyle: {
      fontSize: CELL_FONT_SIZE,
      fontFamily: FONT_SANS,
      color: chrome.bodyColor,
      borderColor: chrome.border,
    },
    headerStyle: header,
    rowHeaderStyle: header,
    cornerHeaderStyle: header,
    bodyStyle: {
      fontSize: CELL_FONT_SIZE,
      fontFamily: FONT_SANS,
      fontWeight: 400,
      color: chrome.bodyColor,
      bgColor: striped ? stripeBg(chrome.stripeOdd, theme.surface.panel) : theme.surface.panel,
      hover: bodyHover,
    },
    frameStyle: {
      ...BASE_FRAME,
      borderColor: chrome.border,
    },
    columnResize: {
      lineColor: chrome.accent,
      bgColor: chrome.accentSoft,
    },
    selectionStyle: {
      cellBgColor: chrome.selection,
      cellBorderColor: chrome.accent,
    },
    functionalIconsStyle: {
      sort_color: chrome.headerColor,
      sort_color_2: chrome.headerColor,
      frozen_color: chrome.headerColor,
      collapse_color: chrome.headerColor,
      expand_color: chrome.headerColor,
    },
  })
}
