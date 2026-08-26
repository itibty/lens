/*
 * Enjoy 常量原子标签：#(NOW_TS) → chip，退格/删除整段
 */
import type { Extension } from '@codemirror/state'
import type { ViewUpdate } from '@codemirror/view'
import type { EnjoyConstantItem } from './enjoyVocab'
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view'
import { escapeRegExp } from './cmUtils'

class ConstChipWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly detail?: string,
  ) {
    super()
  }

  eq(other: ConstChipWidget) {
    return this.label === other.label && this.detail === other.detail
  }

  toDOM() {
    const el = document.createElement('span')
    el.className = 'cm-enjoy-const-chip'
    el.textContent = this.label
    if (this.detail)
      el.title = this.detail
    el.setAttribute('aria-label', `常量 ${this.label}`)
    return el
  }

  ignoreEvent() {
    return false
  }
}

function createConstMatcher(constants: readonly EnjoyConstantItem[]): MatchDecorator | null {
  const labels = constants.map(c => c.label).filter(Boolean)
  if (labels.length === 0)
    return null

  const detailByLabel = new Map(constants.map(c => [c.label, c.detail]))
  const re = new RegExp(`#\\((${labels.map(escapeRegExp).join('|')})\\)`, 'g')

  return new MatchDecorator({
    regexp: re,
    // replace：源码仍是 #(LABEL)，视图换成 chip；配合 atomicRanges 整段删
    decoration: (match) => {
      const label = match[1] || ''
      return Decoration.replace({
        widget: new ConstChipWidget(label, detailByLabel.get(label)),
      })
    },
  })
}

export function enjoyConstChips(
  getConstants: () => EnjoyConstantItem[] | undefined,
): Extension {
  const resolve = () => getConstants() ?? []

  const plugin = ViewPlugin.fromClass(
    class {
      decorations = Decoration.none
      private matcher: MatchDecorator | null = null
      private signature = ''

      constructor(view: EditorView) {
        this.syncMatcher(resolve())
        this.decorations = this.matcher?.createDeco(view) ?? Decoration.none
      }

      /** 词表变更才重建正则；避免每次 keystroke 重编译 */
      private syncMatcher(constants: readonly EnjoyConstantItem[]) {
        const signature = constants.map(c => `${c.label}:${c.detail || ''}`).join('\0')
        if (signature === this.signature)
          return
        this.signature = signature
        this.matcher = createConstMatcher(constants)
      }

      update(update: ViewUpdate) {
        const prev = this.signature
        this.syncMatcher(resolve())
        if (!this.matcher) {
          this.decorations = Decoration.none
          return
        }
        // 词表变了必须 createDeco；文档/视口变才增量 updateDeco
        if (this.signature !== prev || update.docChanged || update.viewportChanged)
          this.decorations = this.matcher.createDeco(update.view)
        else
          this.decorations = this.matcher.updateDeco(update, this.decorations)
      }
    },
    {
      decorations: v => v.decorations,
      // 光标/删除把 chip 当原子区间，避免半截 #(NO|_TS)
      provide: p => EditorView.atomicRanges.of((view) => {
        return view.plugin(p)?.decorations || Decoration.none
      }),
    },
  )

  return [
    plugin,
    EditorView.baseTheme({
      '.cm-enjoy-const-chip': {
        display: 'inline-block',
        verticalAlign: 'baseline',
        margin: '0 1px',
        padding: '0 7px',
        borderRadius: '10px',
        fontSize: '12px',
        lineHeight: '18px',
        fontFamily: 'inherit',
        color: '#1d4ed8',
        backgroundColor: '#dbeafe',
        border: '1px solid #bfdbfe',
        userSelect: 'none',
        cursor: 'default',
      },
    }),
  ]
}
