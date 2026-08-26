/*
 * 补全分组与 Enjoy 上下文判断
 */
import type { Completion, CompletionContext, CompletionSection } from '@codemirror/autocomplete'
import { textBeforeCursor } from './cmUtils'

/** rank 越小越靠前；各组独立编号即可（面板内按 section 聚合） */
export const COMPLETION_SECTIONS = {
  directive: { name: '模板指令', rank: 1 } satisfies CompletionSection,
  snippet: { name: '片段', rank: 2 } satisfies CompletionSection,
  constant: { name: '常量', rank: 1 } satisfies CompletionSection,
  function: { name: '方法', rank: 2 } satisfies CompletionSection,
  loopVar: { name: '模板循环变量', rank: 3 } satisfies CompletionSection,
  table: { name: '表 / 别名', rank: 1 } satisfies CompletionSection,
  field: { name: '字段', rank: 2 } satisfies CompletionSection,
  // 关键字故意靠后，避免压过表/字段/Enjoy
  keyword: { name: 'SQL 关键字', rank: 10 } satisfies CompletionSection,
} as const

export function withSection(
  completion: Completion,
  section: CompletionSection,
): Completion {
  return { ...completion, section }
}

/** 光标处于 Enjoy `#…` 上下文时，避免混入 SQL meta / 关键字 */
export function isEnjoyDirectiveContext(textBefore: string): boolean {
  return /#para\s*\([^)]*$/i.test(textBefore)
    || /#\([^)]*$/.test(textBefore)
    || /#[\w-]*$/.test(textBefore)
}

export function isEnjoyDirectiveAt(context: CompletionContext): boolean {
  return isEnjoyDirectiveContext(textBeforeCursor(context.state, context.pos))
}
