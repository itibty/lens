/*
 * CodeMirror 小工具：装饰插件工厂、光标前文、转义
 */
import type { EditorState, Extension } from '@codemirror/state'
import type { EditorView, MatchDecorator, ViewUpdate } from '@codemirror/view'
import { Decoration, ViewPlugin } from '@codemirror/view'

/** 当前行光标前的文本 */
export function textBeforeCursor(state: EditorState, pos: number): string {
  const line = state.doc.lineAt(pos)
  return line.text.slice(0, pos - line.from)
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** MatchDecorator 常用包装；doc/视口变更时走 updateDeco */
export function matchDecoratorPlugin(decorator: MatchDecorator): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations = Decoration.none

      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view)
      }

      update(update: ViewUpdate) {
        this.decorations = decorator.updateDeco(update, this.decorations)
      }
    },
    { decorations: v => v.decorations },
  )
}
