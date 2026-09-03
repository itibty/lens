<!--
 * @Description: 文本卡片富文本（Notion 风格：选中浮动条，/ 插块）
-->
<script setup lang="ts">
import type { HeadingLevel } from './slashCommand'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'
import { SlashCommand } from './slashCommand'

const props = withDefaults(defineProps<{
  embedded?: boolean
}>(), {
  embedded: false,
})

const TEXT_COLORS = [
  '#F5222D',
  '#FA541C',
  '#FA8C16',
  '#FADB14',
  '#52C41A',
  '#13C2C2',
  '#1677FF',
  '#2F54EB',
  '#722ED1',
  '#EB2F96',
  '#8C8C8C',
  '#141414',
]

const BG_COLORS = [
  '#FFCCC7',
  '#FFD8BF',
  '#FFE7BA',
  '#FFF1B8',
  '#D9F7BE',
  '#B5F5EC',
  '#BAE0FF',
  '#D6E4FF',
  '#EFDBFF',
  '#FFD6E7',
  '#D9D9D9',
  '#BFBFBF',
]

const HEADING_LEVELS: HeadingLevel[] = [1, 2, 3, 4, 5]

const html = defineModel<string | undefined>({ default: undefined })
const openPanel = ref<'heading' | 'color' | 'bg' | null>(null)

function isEmptyHtml(raw?: string) {
  if (!raw?.trim())
    return true
  if (/<(?:img|hr|table|video|mark)\b/i.test(raw))
    return false
  const text = raw.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;/gi, ' ').replace(/<[^>]+>/g, '').trim()
  return !text
}

function persistHtml(raw: string, empty: boolean) {
  html.value = empty || isEmptyHtml(raw) ? undefined : raw
}

const editor = useEditor({
  content: html.value ?? '',
  extensions: [
    StarterKit.configure({
      heading: { levels: HEADING_LEVELS },
      code: false,
      codeBlock: false,
      link: {
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      },
    }),
    TextStyleKit.configure({
      backgroundColor: false,
      fontFamily: false,
      fontSize: false,
      lineHeight: false,
    }),
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: '输入说明文字，或输入 /' }),
    SlashCommand,
  ],
  editorProps: {
    attributes: {
      class: 'simple-html-editor__prose',
    },
  },
  onUpdate({ editor: next }) {
    persistHtml(next.getHTML(), next.isEmpty)
  },
})

const appendBody = () => document.body
const bubbleOptions = {
  placement: 'top' as const,
  offset: 8,
  strategy: 'fixed' as const,
  onHide: () => {
    openPanel.value = null
  },
}

function shouldShowBubble({ editor: ed, from, to }: { editor: { isEditable: boolean, view: { dom: Element } }, from: number, to: number }) {
  if (!ed.isEditable || from === to)
    return false
  return !ed.view.dom.querySelector('.suggestion')
}

function headingLabel() {
  const ed = editor.value
  if (!ed)
    return '正文'
  for (const level of HEADING_LEVELS) {
    if (ed.isActive('heading', { level }))
      return `H${level}`
  }
  return '正文'
}

function togglePanel(name: 'heading' | 'color' | 'bg') {
  openPanel.value = openPanel.value === name ? null : name
}

function setHeading(level?: HeadingLevel) {
  const ed = editor.value
  if (!ed)
    return
  if (!level)
    ed.chain().focus().setParagraph().run()
  else
    ed.chain().focus().toggleHeading({ level }).run()
  openPanel.value = null
}

function applyColor(color?: string) {
  const ed = editor.value
  if (!ed)
    return
  if (!color)
    ed.chain().focus().unsetColor().run()
  else
    ed.chain().focus().setColor(color).run()
  openPanel.value = null
}

function applyHighlight(color?: string) {
  const ed = editor.value
  if (!ed)
    return
  if (!color)
    ed.chain().focus().unsetHighlight().run()
  else
    ed.chain().focus().toggleHighlight({ color }).run()
  openPanel.value = null
}

async function insertLink() {
  const ed = editor.value
  if (!ed)
    return
  openPanel.value = null
  if (ed.isActive('link')) {
    ed.chain().focus().unsetLink().run()
    return
  }
  try {
    const { value } = await ElMessageBox.prompt('链接地址', '插入链接', {
      inputPlaceholder: 'https://',
      inputPattern: /^https?:\/\/.+/i,
      inputErrorMessage: '请输入 http(s) 地址',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    ed.chain().focus().setLink({ href: value.trim(), target: '_blank' }).run()
  }
  catch {
    ed.chain().focus().run()
  }
}

watch(html, (next) => {
  const ed = editor.value
  if (!ed || ed.isFocused)
    return
  const incoming = next ?? ''
  const current = ed.isEmpty ? '' : ed.getHTML()
  if (incoming === current)
    return
  ed.commands.setContent(incoming, { emitUpdate: false })
})
</script>

<template>
  <div class="simple-html-editor" :class="{ 'is-embedded': props.embedded }">
    <EditorContent
      v-if="editor"
      :editor="editor"
    />
    <BubbleMenu
      v-if="editor"
      :editor="editor"
      plugin-key="simpleHtmlBubble"
      :append-to="appendBody"
      :update-delay="0"
      :options="bubbleOptions"
      :should-show="shouldShowBubble"
    >
      <div
        class="simple-html-editor__bubble"
        @mousedown.prevent
      >
        <div class="simple-html-editor__group">
          <button
            type="button"
            class="is-wide"
            title="标题"
            :class="{ 'is-active': editor.isActive('heading') || openPanel === 'heading' }"
            @click="togglePanel('heading')"
          >
            {{ headingLabel() }}
          </button>
          <div
            v-if="openPanel === 'heading'"
            class="simple-html-editor__menu"
          >
            <button
              type="button"
              :class="{ 'is-active': !editor.isActive('heading') }"
              @click="setHeading()"
            >
              正文
            </button>
            <button
              v-for="level in HEADING_LEVELS"
              :key="level"
              type="button"
              :class="{ 'is-active': editor.isActive('heading', { level }) }"
              @click="setHeading(level)"
            >
              标题 {{ level }}
            </button>
          </div>
        </div>
        <i />
        <button
          type="button"
          title="加粗"
          :class="{ 'is-active': editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
        >
          <span class="i-mingcute-bold-line" />
        </button>
        <button
          type="button"
          title="斜体"
          :class="{ 'is-active': editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <span class="i-mingcute-italic-line" />
        </button>
        <button
          type="button"
          title="下划线"
          :class="{ 'is-active': editor.isActive('underline') }"
          @click="editor.chain().focus().toggleUnderline().run()"
        >
          <span class="i-mingcute-underline-line" />
        </button>
        <button
          type="button"
          title="删除线"
          :class="{ 'is-active': editor.isActive('strike') }"
          @click="editor.chain().focus().toggleStrike().run()"
        >
          <span class="i-mingcute-strikethrough-line" />
        </button>
        <div class="simple-html-editor__group">
          <button
            type="button"
            title="文字颜色"
            :class="{ 'is-active': openPanel === 'color' || !!editor.getAttributes('textStyle').color }"
            @click="togglePanel('color')"
          >
            <span class="i-mingcute-text-color-line" />
          </button>
          <div
            v-if="openPanel === 'color'"
            class="simple-html-editor__palette"
          >
            <div class="simple-html-editor__swatches">
              <button
                v-for="color in TEXT_COLORS"
                :key="color"
                type="button"
                class="simple-html-editor__swatch"
                :style="{ background: color }"
                @click="applyColor(color)"
              />
            </div>
            <button
              type="button"
              class="simple-html-editor__clear"
              @click="applyColor()"
            >
              清空
            </button>
          </div>
        </div>
        <div class="simple-html-editor__group">
          <button
            type="button"
            title="背景色"
            :class="{ 'is-active': openPanel === 'bg' || editor.isActive('highlight') }"
            @click="togglePanel('bg')"
          >
            <span class="simple-html-editor__bg">
              <span>A</span>
              <i />
            </span>
          </button>
          <div
            v-if="openPanel === 'bg'"
            class="simple-html-editor__palette"
          >
            <div class="simple-html-editor__swatches">
              <button
                v-for="color in BG_COLORS"
                :key="color"
                type="button"
                class="simple-html-editor__swatch"
                :style="{ background: color }"
                @click="applyHighlight(color)"
              />
            </div>
            <button
              type="button"
              class="simple-html-editor__clear"
              @click="applyHighlight()"
            >
              清空
            </button>
          </div>
        </div>
        <i />
        <button
          type="button"
          title="无序列表"
          :class="{ 'is-active': editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
        >
          <span class="i-tabler-list" />
        </button>
        <button
          type="button"
          title="有序列表"
          :class="{ 'is-active': editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
        >
          <span class="i-tabler-list-numbers" />
        </button>
        <i />
        <button
          type="button"
          title="链接"
          :class="{ 'is-active': editor.isActive('link') }"
          @click="insertLink"
        >
          <span class="i-tabler-link" />
        </button>
      </div>
    </BubbleMenu>
  </div>
</template>

<style scoped lang="scss">
.simple-html-editor {
  height: 212px;
  min-height: 140px;
  max-height: 70vh;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
  overflow: auto;
  resize: vertical;

  :deep(.tiptap) {
    min-height: 100%;
    padding: 12px 14px;
    outline: none;
    font: 13px / 1.65 var(--na-font-sans);
    color: var(--el-text-color-primary);

    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      color: var(--el-text-color-placeholder);
      float: left;
      height: 0;
      pointer-events: none;
    }

    p {
      margin: 0 0 0.6em;

      &:last-child {
        margin-bottom: 0;
      }
    }

    h1,
    h2,
    h3,
    h4,
    h5 {
      margin: 0 0 0.45em;
      line-height: 1.35;
    }

    h1 {
      font-size: 20px;
      font-weight: 700;
    }

    h2 {
      font-size: 17px;
      font-weight: 650;
    }

    h3 {
      font-size: 15px;
      font-weight: 600;
    }

    h4 {
      font-size: 13px;
      font-weight: 600;
    }

    h5 {
      font-size: 12px;
      font-weight: 600;
    }

    ul,
    ol {
      margin: 0 0 0.6em 1.25em;
      padding: 0;
    }

    ul {
      list-style: disc;
    }

    ol {
      list-style: decimal;
    }

    blockquote {
      margin: 0 0 0.6em;
      padding: 0 0 0 0.8em;
      border-left: 3px solid var(--el-border-color);
      color: var(--el-text-color-regular);
    }

    hr {
      margin: 0.8em 0;
      border: none;
      border-top: 1px solid var(--el-border-color);
    }

    a {
      color: var(--el-color-primary);
    }

    mark {
      padding: 0 0.12em;
      border-radius: 2px;
      color: inherit;
    }
  }

  &.is-embedded {
    width: 100%;
    height: auto;
    min-height: 0;
    max-height: none;
    border: none;
    border-radius: 0;
    background: transparent;
    overflow: visible;
    resize: none;
    user-select: text;

    :deep(.tiptap) {
      min-height: 1.65em;
      padding: 0;
      font: inherit;
      color: inherit;

      p.is-editor-empty:first-child::before {
        color: var(--dash-content-muted, var(--el-text-color-placeholder));
      }

      blockquote {
        border-left-color: var(--dash-border, var(--el-border-color));
        color: var(--dash-content-muted, var(--el-text-color-regular));
      }

      a {
        color: var(--dash-accent, var(--el-color-primary));
      }
    }
  }
}

.simple-html-editor__bubble {
  z-index: 3200;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 10px;
  background: var(--el-bg-color);
  box-shadow: 0 10px 28px rgb(15 23 42 / 12%);

  > i {
    width: 1px;
    height: 16px;
    margin: 0 2px;
    background: var(--el-border-color-extra-light);
  }

  button {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--el-text-color-regular);
    font-size: 15px;
    cursor: pointer;

    &:hover {
      background: var(--el-fill-color);
    }

    &.is-active {
      background: var(--el-fill-color);
      color: var(--el-color-primary);
    }

    &.is-wide {
      width: auto;
      min-width: 36px;
      padding: 0 7px;
      font-size: 12px;
      font-weight: 650;
    }
  }
}

.simple-html-editor__group {
  position: relative;
}

.simple-html-editor__menu,
.simple-html-editor__palette {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 1;
  padding: 6px;
  border: 1px solid var(--el-border-color-extra-light);
  border-radius: 8px;
  background: var(--el-bg-color);
  box-shadow: 0 8px 20px rgb(15 23 42 / 12%);
}

.simple-html-editor__menu {
  min-width: 108px;
  display: flex;
  flex-direction: column;
  gap: 2px;

  button {
    width: 100%;
    height: 28px;
    justify-content: flex-start;
    padding: 0 8px;
    font-size: 12px;
  }
}

.simple-html-editor__palette {
  width: 168px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.simple-html-editor__swatches {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.simple-html-editor__swatch {
  width: 20px !important;
  height: 20px !important;
  padding: 0;
  border: 1px solid rgb(0 0 0 / 8%) !important;
  border-radius: 4px !important;
}

.simple-html-editor__clear {
  align-self: flex-end;
  width: auto !important;
  height: auto !important;
  padding: 0 2px !important;
  font-size: 12px !important;
  color: var(--el-color-primary) !important;
}

.simple-html-editor__bg {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;

  > i {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    border-radius: 1px;
    background: currentColor;
  }
}
</style>
