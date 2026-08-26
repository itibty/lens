/*
 * Enjoy Overlay 高亮：整体呈 SQL 注释感（灰斜体）；常量 chip 另见 enjoyConstChips
 */
import type { Extension } from '@codemirror/state'
import type { ViewUpdate } from '@codemirror/view'
import { Decoration, EditorView, MatchDecorator, ViewPlugin } from '@codemirror/view'
import { matchDecoratorPlugin } from './cmUtils'

const enjoyMark = Decoration.mark({ class: 'cm-enjoy' })

const blockDirectiveDecorator = new MatchDecorator({
  regexp: /#(?:if|for|else|elseif|end|set|inc)\b[^\n]*/gi,
  decoration: enjoyMark,
})

const paraDecorator = new MatchDecorator({
  regexp: /#para\s*\([^)]*\)/gi,
  decoration: enjoyMark,
})

/**
 * 扫描配对括号，得到完整 `#(...)` 区间（含最外层末尾 `)`）。
 * 忽略字符串内的括号；换行未闭合则放弃。
 * 仅标记含 `.` 的表达式；纯 #(CONST) 交给 chip。
 */
function buildInterpExprDeco(view: EditorView) {
  const ranges: { from: number, to: number }[] = []
  const text = view.state.doc.toString()
  const len = text.length
  let i = 0

  while (i < len) {
    if (text[i] !== '#' || text[i + 1] !== '(') {
      i += 1
      continue
    }

    const start = i
    i += 2
    let depth = 1
    let quote: string | null = null
    let hasDot = false

    while (i < len && depth > 0) {
      const ch = text[i]!
      if (ch === '\n')
        break

      if (quote) {
        if (ch === '\\' && i + 1 < len) {
          i += 2
          continue
        }
        if (ch === quote)
          quote = null
        i += 1
        continue
      }

      if (ch === '"' || ch === '\'') {
        quote = ch
        i += 1
        continue
      }

      if (ch === '.')
        hasDot = true
      else if (ch === '(')
        depth += 1
      else if (ch === ')')
        depth -= 1

      i += 1
    }

    if (depth === 0 && hasDot)
      ranges.push({ from: start, to: i })
  }

  return Decoration.set(ranges.map(r => enjoyMark.range(r.from, r.to)))
}

function interpExprPlugin(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations = Decoration.none

      constructor(view: EditorView) {
        this.decorations = buildInterpExprDeco(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged)
          this.decorations = buildInterpExprDeco(update.view)
      }
    },
    { decorations: v => v.decorations },
  )
}

// !important：盖住 SQL highlighter 写在内部 span 上的 .tok-* 颜色
const enjoyHighlightTheme = EditorView.baseTheme({
  '.cm-enjoy, .cm-enjoy *': {
    color: '#9ca3af !important',
    fontStyle: 'italic !important',
    fontWeight: 'normal !important',
  },
})

export function enjoyHighlight(): Extension {
  return [
    matchDecoratorPlugin(blockDirectiveDecorator),
    matchDecoratorPlugin(paraDecorator),
    interpExprPlugin(),
    enjoyHighlightTheme,
  ]
}
