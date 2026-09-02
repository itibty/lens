import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import Suggestion from '@tiptap/suggestion'
import { Extension, VueRenderer } from '@tiptap/vue-3'
import SlashCommandMenu from './SlashCommandMenu.vue'

type SlashCommandPayload = Parameters<NonNullable<SuggestionOptions['command']>>[0]
type SlashEditor = SlashCommandPayload['editor']
type SlashRange = SlashCommandPayload['range']

export type HeadingLevel = 1 | 2 | 3 | 4 | 5

export interface SlashCommandItem {
  title: string
  icon: string
  group: string
  keywords: string[]
  /** 无搜索词时是否展示；H4/H5 等低频项仅搜索命中 */
  featured?: boolean
  apply: (editor: SlashEditor, range: SlashRange) => void
}

const HEADING_ICONS: Record<HeadingLevel, string> = {
  1: 'i-tabler-h-1',
  2: 'i-tabler-h-2',
  3: 'i-tabler-h-3',
  4: 'i-tabler-h-4',
  5: 'i-tabler-h-5',
}

function headingItem(level: HeadingLevel): SlashCommandItem {
  return {
    title: `标题 ${level}`,
    icon: HEADING_ICONS[level],
    group: '标题',
    featured: level <= 3,
    keywords: [`h${level}`, 'heading', '标题'],
    apply: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level }).run()
    },
  }
}

const SLASH_ITEMS: SlashCommandItem[] = [
  {
    title: '正文',
    icon: 'i-mingcute-paragraph-line',
    group: '文本',
    keywords: ['text', 'p', 'paragraph', '正文', '段落'],
    apply: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run()
    },
  },
  headingItem(1),
  headingItem(2),
  headingItem(3),
  headingItem(4),
  headingItem(5),
  {
    title: '无序列表',
    icon: 'i-tabler-list',
    group: '列表',
    keywords: ['ul', 'list', 'bullet', '列表', '无序'],
    apply: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
  },
  {
    title: '有序列表',
    icon: 'i-tabler-list-numbers',
    group: '列表',
    keywords: ['ol', 'list', 'numbered', '列表', '有序', '数字'],
    apply: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
  },
  {
    title: '引用',
    icon: 'i-mingcute-quote-left-line',
    group: '插入',
    keywords: ['quote', 'blockquote', '引用', '摘录'],
    apply: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
  },
  {
    title: '分割线',
    icon: 'i-tabler-separator-horizontal',
    group: '插入',
    keywords: ['hr', 'divider', 'line', '分割', '分隔', '分割线'],
    apply: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
  },
]

function filterSlashItems(query: string) {
  const q = query.trim().toLowerCase()
  if (!q)
    return SLASH_ITEMS.filter(item => item.featured !== false)
  return SLASH_ITEMS.filter(item =>
    item.title.toLowerCase().includes(q)
    || item.keywords.some(key => key.includes(q)))
}

function renderSlashMenu(): ReturnType<NonNullable<SuggestionOptions<SlashCommandItem, SlashCommandItem>['render']>> {
  let renderer: VueRenderer | undefined
  let unmount: (() => void) | undefined

  function sync(props: SuggestionProps<SlashCommandItem, SlashCommandItem>) {
    renderer?.updateProps({
      items: props.items,
      command: props.command,
    })
  }

  return {
    onStart(props) {
      renderer = new VueRenderer(SlashCommandMenu, {
        editor: props.editor,
        props: {
          items: props.items,
          command: props.command,
        },
      })
      const el = renderer.element
      if (el instanceof HTMLElement)
        unmount = props.mount(el)
    },
    onUpdate(props) {
      sync(props)
    },
    onKeyDown(props) {
      if (props.event.key === 'Escape') {
        unmount?.()
        renderer?.destroy()
        return true
      }
      return renderer?.ref?.onKeyDown(props) ?? false
    },
    onExit() {
      unmount?.()
      renderer?.destroy()
      unmount = undefined
      renderer = undefined
    },
  }
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        editor: this.editor,
        char: '/',
        allowSpaces: false,
        startOfLine: false,
        placement: 'bottom-start',
        offset: { mainAxis: 8 },
        floatingUi: { strategy: 'fixed' },
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => {
          props.apply(editor, range)
        },
        render: renderSlashMenu,
      }),
    ]
  },
})
