/*
 * SQL 关键字补全：未配置 → StandardSQL 默认；已配置 → 自定义列表（空数组 = 关闭）
 */
import type { Completion, CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete'
import { keywordCompletionSource, StandardSQL } from '@codemirror/lang-sql'
import { COMPLETION_SECTIONS, isEnjoyDirectiveAt, withSection } from './completionSections'

export interface SqlKeywordItem {
  label: string
  detail?: string
  boost?: number
}

export type SqlKeywordInput = string | SqlKeywordItem

function normalizeKeywords(list: SqlKeywordInput[]): SqlKeywordItem[] {
  return list
    .map(item => (typeof item === 'string' ? { label: item } : item))
    .filter(item => !!item.label)
}

function withKeywordSection(result: CompletionResult): CompletionResult {
  return {
    ...result,
    options: result.options.map(opt => withSection(opt, COMPLETION_SECTIONS.keyword)),
  }
}

function createCustomKeywordSource(getKeywords: () => SqlKeywordInput[]): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    if (isEnjoyDirectiveAt(context))
      return null

    const word = context.matchBefore(/\w+/)
    if (!word && !context.explicit)
      return null

    const prefix = (word?.text ?? '').toLowerCase()
    const from = word ? word.from : context.pos
    const options: Completion[] = normalizeKeywords(getKeywords())
      .filter(item => !prefix || item.label.toLowerCase().startsWith(prefix))
      .map(item => withSection({
        label: item.label,
        type: 'keyword',
        detail: item.detail,
        boost: item.boost ?? 1,
      }, COMPLETION_SECTIONS.keyword))

    return options.length ? { from, options, validFor: /^\w*$/ } : null
  }
}

function createDefaultKeywordSource(): CompletionSource {
  const base = keywordCompletionSource(StandardSQL)
  return (context) => {
    if (isEnjoyDirectiveAt(context))
      return null

    const result = base(context)
    if (!result)
      return null
    if (result instanceof Promise)
      return result.then(res => (res ? withKeywordSection(res) : null))
    return withKeywordSection(result)
  }
}

export function createSectionedKeywordSource(
  getKeywords: () => SqlKeywordInput[] | undefined,
): CompletionSource {
  const defaultSource = createDefaultKeywordSource()
  const customSource = createCustomKeywordSource(() => getKeywords() ?? [])

  return (context) => {
    // undefined → 方言默认；[] → 关闭；非空数组 → 自定义
    return getKeywords() === undefined
      ? defaultSource(context)
      : customSource(context)
  }
}
