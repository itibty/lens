/*
 * 补全面板样式：对齐项目 Element Plus 浅色风格，干净简洁
 * 注意：必须用 EditorView.theme，且不能写 &light/&dark（那是 baseTheme 专用）
 */
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

/** 品牌主色，与 variables.scss $cfe-color-primary 一致 */
const PRIMARY = '#0052d9'
const TEXT = '#303133'
const TEXT_SECONDARY = '#606266'
const TEXT_WEAK = '#909399'
const BORDER = '#e4e7ed'
const HEADER_BG = '#f5f7fa'
const SELECTED_BG = 'rgba(0, 82, 217, 0.08)'
const HOVER_BG = '#f5f7fa'

export function completionPanelTheme(): Extension {
  return EditorView.theme({
    '.cm-tooltip': {
      border: `1px solid ${BORDER}`,
      borderRadius: '4px',
      backgroundColor: '#fff',
      color: TEXT,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      fontFamily: 'inherit',
    },

    '.cm-tooltip.cm-tooltip-autocomplete': {
      '& > ul': {
        'fontFamily': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        'fontSize': '12px',
        'minWidth': '220px',
        'maxWidth': '360px',
        'maxHeight': '240px',
        'padding': '4px 0',
        '& > li': {
          padding: '5px 10px',
          lineHeight: '1.45',
          color: TEXT,
          margin: '0 4px',
          borderRadius: '3px',
        },
        '& > li:hover': {
          backgroundColor: HOVER_BG,
        },
        '& > completion-section': {
          display: 'block',
          margin: '4px 0 2px',
          padding: '4px 12px 2px',
          borderBottom: 'none',
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.02em',
          color: TEXT_WEAK,
          backgroundColor: 'transparent',
          opacity: '1',
          lineHeight: '1.4',
        },
      },
    },

    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: SELECTED_BG,
      color: PRIMARY,
    },
    '.cm-tooltip-autocomplete ul li[aria-selected] .cm-completionDetail': {
      color: TEXT_SECONDARY,
    },
    '.cm-tooltip-autocomplete-disabled ul li[aria-selected]': {
      backgroundColor: HEADER_BG,
      color: TEXT_WEAK,
    },

    '.cm-completionMatchedText': {
      textDecoration: 'none',
      color: PRIMARY,
      fontWeight: '600',
    },

    '.cm-completionDetail': {
      marginLeft: '8px',
      fontStyle: 'normal',
      fontSize: '11px',
      color: TEXT_WEAK,
    },

    '.cm-completionIcon': {
      opacity: '0.45',
      color: TEXT_SECONDARY,
      width: '1em',
      paddingRight: '6px',
    },

    '.cm-tooltip.cm-completionInfo': {
      padding: '8px 10px',
      fontSize: '12px',
      color: TEXT_SECONDARY,
      lineHeight: '1.5',
      border: `1px solid ${BORDER}`,
      borderRadius: '4px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
      maxWidth: '280px',
    },
  })
}
