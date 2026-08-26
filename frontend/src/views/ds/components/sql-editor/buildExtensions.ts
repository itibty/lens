/*
 * SqlTemplateEditor CodeMirror extensions 组装
 *
 * 层次（自上而下）：
 * 1. SQL 语言 + 语法高亮
 * 2. UI 主题（补全面板）
 * 3. Enjoy：常量 chip / 注释风 Overlay
 * 4. 补全：Enjoy → dbmeta 上下文 → SQL 关键字
 */
import type { Extension } from '@codemirror/state'
import type { EnjoyConstantItem, EnjoyMethodItem } from './enjoyVocab'
import type { SqlKeywordInput } from './keywordCompletion'
import { autocompletion } from '@codemirror/autocomplete'
import { sql, StandardSQL } from '@codemirror/lang-sql'
import { Prec } from '@codemirror/state'
import { completionPanelTheme } from './completionTheme'
import { createEnjoyCompletionSource } from './enjoyCompletion'
import { enjoyConstChips } from './enjoyConstChips'
import { enjoyHighlight } from './enjoyHighlight'
import { createSectionedKeywordSource } from './keywordCompletion'
import { createMetaCompletionSource } from './metaCompletion'
import { sqlSyntaxHighlighting } from './sqlHighlightStyle'

export interface SqlEditorExtensionOptions {
  getSqlMeta: () => VIS.SchemaInfo[] | undefined
  getConstants: () => EnjoyConstantItem[] | undefined
  getMethods: () => EnjoyMethodItem[] | undefined
  /** undefined = StandardSQL 默认；数组 = 自定义（空 = 关闭关键字补全） */
  getKeywords: () => SqlKeywordInput[] | undefined
}

export function buildSqlTemplateExtensions(options: SqlEditorExtensionOptions): Extension[] {
  const { getSqlMeta, getConstants, getMethods, getKeywords } = options

  return [
    sql({ dialect: StandardSQL }),
    sqlSyntaxHighlighting(),

    completionPanelTheme(),

    // chip 用 Decoration.replace；与灰斜 Overlay 并存时由 atomic 范围优先视觉
    enjoyConstChips(getConstants),
    enjoyHighlight(),

    // Prec.high + override：只走下方源，顺序 = Enjoy → meta → 关键字
    Prec.high(autocompletion({
      override: [
        createEnjoyCompletionSource(getConstants, getMethods),
        createMetaCompletionSource(getSqlMeta),
        createSectionedKeywordSource(getKeywords),
      ],
    })),
  ]
}
