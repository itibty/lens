/*
 * Enjoy 模板 CompletionSource
 * 触发：#(… 内) / #指令 / 裸词 NOW|kit|for.（自动包成 #(…)）
 */
import type { Completion, CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete'
import type { EnjoyCompletionItem, EnjoyConstantItem, EnjoyMethodItem } from './enjoyVocab'
import { textBeforeCursor } from './cmUtils'
import { COMPLETION_SECTIONS, withSection } from './completionSections'
import {
  constantsToCompletions,
  ENJOY_DIRECTIVES,
  ENJOY_SNIPPETS,
  loopVarsToCompletions,
  methodsToCompletions,
} from './enjoyVocab'

function toCompletion(item: EnjoyCompletionItem): Completion {
  return {
    label: item.label,
    type: item.type,
    detail: item.detail,
    info: item.info,
    apply: item.apply ?? item.label,
    boost: item.boost,
  }
}

function matchByPrefix(item: EnjoyCompletionItem, prefix: string): boolean {
  if (!prefix)
    return true
  const needle = prefix.toLowerCase()
  return item.label.toLowerCase().includes(needle)
    || (item.detail?.toLowerCase().includes(needle) ?? false)
}

function sectioned(
  items: EnjoyCompletionItem[],
  section: (typeof COMPLETION_SECTIONS)[keyof typeof COMPLETION_SECTIONS],
): Completion[] {
  return items.map(item => withSection(toCompletion(item), section))
}

function buildInterpOptions(
  mode: 'inside' | 'bare',
  prefix: string,
  constants: EnjoyConstantItem[],
  methods: EnjoyMethodItem[],
): Completion[] {
  return [
    ...sectioned(
      constantsToCompletions(constants, mode).filter(i => matchByPrefix(i, prefix)),
      COMPLETION_SECTIONS.constant,
    ),
    ...sectioned(
      methodsToCompletions(methods, mode).filter(i => matchByPrefix(i, prefix)),
      COMPLETION_SECTIONS.function,
    ),
    ...sectioned(
      loopVarsToCompletions(mode).filter(i => matchByPrefix(i, prefix)),
      COMPLETION_SECTIONS.loopVar,
    ),
  ]
}

export function createEnjoyCompletionSource(
  getConstants: () => EnjoyConstantItem[] | undefined,
  getMethods: () => EnjoyMethodItem[] | undefined,
): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    const { state, pos } = context
    const textBefore = textBeforeCursor(state, pos)
    const constants = getConstants() ?? []
    const methods = getMethods() ?? []

    // 1) 已在 #(… 内：只补 LABEL / 方法体，apply 带收尾 )
    const interpMatch = textBefore.match(/#\(\s*([\w.]*)$/)
    if (interpMatch) {
      const prefix = interpMatch[1] ?? ''
      const options = buildInterpOptions('inside', prefix, constants, methods)
      return options.length
        ? { from: pos - prefix.length, options, validFor: /^[\w.]*$/ }
        : null
    }

    // 2) # 指令 / 片段：from 含 #，整段替换为 apply（含换行块）
    const hashMatch = textBefore.match(/#([\w-]*)$/)
    if (hashMatch) {
      const prefix = hashMatch[1] ?? ''
      const options = [
        ...sectioned(ENJOY_DIRECTIVES.filter(i => matchByPrefix(i, prefix)), COMPLETION_SECTIONS.directive),
        ...sectioned(ENJOY_SNIPPETS.filter(i => matchByPrefix(i, prefix)), COMPLETION_SECTIONS.snippet),
      ]
      return options.length
        ? { from: pos - prefix.length - 1, options, validFor: /^#[\w-]*$/ }
        : null
    }

    // 3) 裸词：选中后自动包成 #(…)，≥2 字符才隐式弹出，避免吵
    const word = context.matchBefore(/[\w.]+/)
    if (!word && !context.explicit)
      return null
    const prefix = word?.text ?? ''
    if (!context.explicit && prefix.length < 2)
      return null

    const options = buildInterpOptions('bare', prefix, constants, methods)
    return options.length
      ? { from: word ? word.from : pos, options, validFor: /^[\w.]*$/ }
      : null
  }
}
