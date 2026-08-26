/*
 * SQL / Enjoy 语法高亮样式（浅色编辑器）
 */
import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

const sqlTemplateHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#1d4ed8', fontWeight: '600' },
  { tag: t.operatorKeyword, color: '#1d4ed8', fontWeight: '600' },
  { tag: t.typeName, color: '#a16207' },
  { tag: t.name, color: '#1f2937' },
  { tag: t.propertyName, color: '#1d4ed8' },
  { tag: t.variableName, color: '#a16207' },
  { tag: t.string, color: '#0369a1' },
  { tag: t.number, color: '#0284c7' },
  { tag: t.bool, color: '#1d4ed8' },
  { tag: t.null, color: '#1d4ed8' },
  { tag: t.comment, color: '#9ca3af', fontStyle: 'italic' },
  { tag: t.operator, color: '#dc2626' },
  { tag: t.punctuation, color: '#4b5563' },
  { tag: t.paren, color: '#4b5563' },
  { tag: t.squareBracket, color: '#4b5563' },
  { tag: t.brace, color: '#4b5563' },
  { tag: t.special(t.string), color: '#0369a1' },
])

export function sqlSyntaxHighlighting(): Extension {
  return syntaxHighlighting(sqlTemplateHighlightStyle)
}
