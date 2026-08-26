import type { TYPES } from '@visactor/vtable'
import type { VisChartThemeId, VisVisualConfig } from './types'
import { themes } from '@visactor/vtable'
import { resolveChartThemeId } from './chartPalette'
import { resolveTableStyle } from './tableStyle'

type ITableThemeDefine = TYPES.ITableThemeDefine

const CELL_FONT_SIZE = 13
const BODY_BG = '#FFFFFF'
const DEFAULT_STRIPE = '#F7F8FA'

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
export const VTABLE_EMPTY_TEXT = '暂无数据'

export const VTABLE_EMPTY_TIP = {
  text: VTABLE_EMPTY_TEXT,
  displayMode: 'basedOnTable',
  spaceBetweenTextAndIcon: 0,
  textStyle: {
    fontSize: 13,
    color: '#909399',
  },
  icon: {
    width: 0,
    height: 0,
    image: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
  },
} as const

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

const DEFAULT_HEADER_BG = '#ECF1F5'
const DEFAULT_BODY_COLOR = '#000000'

/** CONTRAST = Tableau；COLORBLIND = Okabe-Ito。默认不写，沿用官方表头。 */
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

const HEADER_FONT = { fontSize: CELL_FONT_SIZE, fontWeight: 600 } as const

export function resolveTableHeaderIconColor(visual?: VisVisualConfig) {
  return TABLE_CHROME[resolveChartThemeId(visual)]?.headerColor ?? '#646A73'
}

/** 官方 DEFAULT；预设只叠表头 / 字色 / 外框，以及可选斑马纹 */
export function resolveVTableTheme(visual?: VisVisualConfig): ITableThemeDefine {
  const striped = resolveTableStyle(visual).striped
  const chrome = TABLE_CHROME[resolveChartThemeId(visual)]

  if (!chrome) {
    return themes.DEFAULT.extends({
      underlayBackgroundColor: 'transparent',
      defaultStyle: { fontSize: CELL_FONT_SIZE },
      headerStyle: HEADER_FONT,
      rowHeaderStyle: HEADER_FONT,
      cornerHeaderStyle: HEADER_FONT,
      bodyStyle: {
        fontSize: CELL_FONT_SIZE,
        fontWeight: 400,
        ...(striped ? { bgColor: stripeBg(DEFAULT_STRIPE) } : {}),
      },
      frameStyle: BASE_FRAME,
    })
  }

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

  return themes.DEFAULT.extends({
    underlayBackgroundColor: 'transparent',
    defaultStyle: {
      fontSize: CELL_FONT_SIZE,
      color: chrome.bodyColor,
      borderColor: chrome.border,
    },
    headerStyle: header,
    rowHeaderStyle: header,
    cornerHeaderStyle: header,
    bodyStyle: {
      fontSize: CELL_FONT_SIZE,
      fontWeight: 400,
      color: chrome.bodyColor,
      bgColor: striped ? stripeBg(chrome.stripeOdd) : BODY_BG,
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
