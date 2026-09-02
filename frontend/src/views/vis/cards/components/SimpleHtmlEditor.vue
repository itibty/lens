<!--
 * @Description: 文本卡片富文本（Tiptap：标题 / 强调 / 列表 / 颜色 / 对齐 / 链接）
-->
<script setup lang="ts">
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'

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

const html = defineModel<string | undefined>({ default: undefined })
const sourceMode = ref(false)
const tick = ref(0)

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

const sourceText = computed({
  get: () => html.value ?? '',
  set: (value: string) => {
    persistHtml(value, isEmptyHtml(value))
  },
})

const editor = useEditor({
  content: html.value ?? '',
  extensions: [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
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
    Placeholder.configure({ placeholder: '输入说明文字' }),
  ],
  editorProps: {
    attributes: {
      class: 'simple-html-editor__prose',
    },
  },
  onUpdate({ editor: next }) {
    if (sourceMode.value)
      return
    persistHtml(next.getHTML(), next.isEmpty)
  },
  onSelectionUpdate: () => {
    tick.value += 1
  },
  onTransaction: () => {
    tick.value += 1
  },
})

const active = computed(() => {
  void tick.value
  const ed = editor.value
  return {
    bold: ed?.isActive('bold') ?? false,
    italic: ed?.isActive('italic') ?? false,
    underline: ed?.isActive('underline') ?? false,
    strike: ed?.isActive('strike') ?? false,
    h2: ed?.isActive('heading', { level: 2 }) ?? false,
    h3: ed?.isActive('heading', { level: 3 }) ?? false,
    bullet: ed?.isActive('bulletList') ?? false,
    ordered: ed?.isActive('orderedList') ?? false,
    alignLeft: ed?.isActive({ textAlign: 'left' }) ?? false,
    alignCenter: ed?.isActive({ textAlign: 'center' }) ?? false,
    alignRight: ed?.isActive({ textAlign: 'right' }) ?? false,
    link: ed?.isActive('link') ?? false,
    canUndo: ed?.can().undo() ?? false,
    canRedo: ed?.can().redo() ?? false,
  }
})

function run(fn: (ed: NonNullable<typeof editor.value>) => void) {
  const ed = editor.value
  if (!ed || sourceMode.value)
    return
  fn(ed)
}

function applyColor(color?: string) {
  run((ed) => {
    if (!color)
      ed.chain().focus().unsetColor().run()
    else
      ed.chain().focus().setColor(color).run()
  })
}

function applyHighlight(color?: string) {
  run((ed) => {
    if (!color)
      ed.chain().focus().unsetHighlight().run()
    else
      ed.chain().focus().toggleHighlight({ color }).run()
  })
}

async function insertLink() {
  const ed = editor.value
  if (!ed || sourceMode.value)
    return
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

function clearFormat() {
  run(ed => ed.chain().focus().unsetAllMarks().clearNodes().run())
}

function toggleSource() {
  const ed = editor.value
  if (!sourceMode.value && ed)
    persistHtml(ed.getHTML(), ed.isEmpty)
  sourceMode.value = !sourceMode.value
  if (!sourceMode.value) {
    void nextTick(() => {
      editor.value?.commands.setContent(html.value ?? '', { emitUpdate: false })
    })
  }
}

watch(html, (next) => {
  const ed = editor.value
  if (!ed || sourceMode.value || ed.isFocused)
    return
  const incoming = next ?? ''
  const current = ed.isEmpty ? '' : ed.getHTML()
  if (incoming === current)
    return
  ed.commands.setContent(incoming, { emitUpdate: false })
})
</script>

<template>
  <div class="simple-html-editor">
    <div
      class="simple-html-editor__bar"
      @mousedown.prevent
    >
      <template v-if="!sourceMode && editor">
        <button
          type="button"
          class="simple-html-editor__tool"
          :disabled="!active.canUndo"
          title="撤销"
          @click="run(ed => ed.chain().focus().undo().run())"
        >
          <span class="i-tabler-arrow-back-up" />
        </button>
        <button
          type="button"
          class="simple-html-editor__tool"
          :disabled="!active.canRedo"
          title="重做"
          @click="run(ed => ed.chain().focus().redo().run())"
        >
          <span class="i-tabler-arrow-forward-up" />
        </button>
        <i class="simple-html-editor__split" />
        <button
          type="button"
          class="simple-html-editor__tool"
          :class="{ 'is-on': active.bold }"
          title="加粗"
          @click="run(ed => ed.chain().focus().toggleBold().run())"
        >
          <span class="i-mingcute-bold-line" />
        </button>
        <button
          type="button"
          class="simple-html-editor__tool"
          :class="{ 'is-on': active.italic }"
          title="斜体"
          @click="run(ed => ed.chain().focus().toggleItalic().run())"
        >
          <span class="i-mingcute-italic-line" />
        </button>
        <button
          type="button"
          class="simple-html-editor__tool"
          :class="{ 'is-on': active.underline }"
          title="下划线"
          @click="run(ed => ed.chain().focus().toggleUnderline().run())"
        >
          <span class="i-mingcute-underline-line" />
        </button>
        <button
          type="button"
          class="simple-html-editor__tool"
          :class="{ 'is-on': active.strike }"
          title="删除线"
          @click="run(ed => ed.chain().focus().toggleStrike().run())"
        >
          <span class="i-mingcute-strikethrough-line" />
        </button>
        <el-popover
          placement="bottom"
          :width="196"
          trigger="hover"
          :show-after="200"
        >
          <template #reference>
            <button
              type="button"
              class="simple-html-editor__tool"
              title="文字颜色"
            >
              <span class="i-mingcute-text-color-line" />
            </button>
          </template>
          <div
            class="simple-html-editor__palette"
            @mousedown.prevent
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
        </el-popover>
        <el-popover
          placement="bottom"
          :width="196"
          trigger="hover"
          :show-after="200"
        >
          <template #reference>
            <button
              type="button"
              class="simple-html-editor__tool"
              title="背景色"
            >
              <span class="simple-html-editor__bg">
                <span class="simple-html-editor__bg-letter">A</span>
                <i class="simple-html-editor__bg-bar" />
              </span>
            </button>
          </template>
          <div
            class="simple-html-editor__palette"
            @mousedown.prevent
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
        </el-popover>
        <i class="simple-html-editor__split" />
        <button
          type="button"
          class="simple-html-editor__tool is-text"
          :class="{ 'is-on': active.h2 }"
          title="二级标题"
          @click="run(ed => ed.chain().focus().toggleHeading({ level: 2 }).run())"
        >
          H2
        </button>
        <button
          type="button"
          class="simple-html-editor__tool is-text"
          :class="{ 'is-on': active.h3 }"
          title="三级标题"
          @click="run(ed => ed.chain().focus().toggleHeading({ level: 3 }).run())"
        >
          H3
        </button>
        <button
          type="button"
          class="simple-html-editor__tool"
          :class="{ 'is-on': active.bullet }"
          title="无序列表"
          @click="run(ed => ed.chain().focus().toggleBulletList().run())"
        >
          <span class="i-tabler-list" />
        </button>
        <button
          type="button"
          class="simple-html-editor__tool"
          :class="{ 'is-on': active.ordered }"
          title="有序列表"
          @click="run(ed => ed.chain().focus().toggleOrderedList().run())"
        >
          <span class="i-tabler-list-numbers" />
        </button>
        <el-popover
          placement="bottom"
          :width="120"
          trigger="hover"
          :show-after="200"
        >
          <template #reference>
            <button
              type="button"
              class="simple-html-editor__tool"
              :class="{ 'is-on': active.alignCenter || active.alignRight }"
              title="对齐"
            >
              <span class="i-mingcute-align-left-line" />
            </button>
          </template>
          <div
            class="simple-html-editor__aligns"
            @mousedown.prevent
          >
            <button
              type="button"
              class="simple-html-editor__tool"
              :class="{ 'is-on': active.alignLeft }"
              title="左对齐"
              @click="run(ed => ed.chain().focus().setTextAlign('left').run())"
            >
              <span class="i-mingcute-align-left-line" />
            </button>
            <button
              type="button"
              class="simple-html-editor__tool"
              :class="{ 'is-on': active.alignCenter }"
              title="居中"
              @click="run(ed => ed.chain().focus().setTextAlign('center').run())"
            >
              <span class="i-mingcute-align-center-line" />
            </button>
            <button
              type="button"
              class="simple-html-editor__tool"
              :class="{ 'is-on': active.alignRight }"
              title="右对齐"
              @click="run(ed => ed.chain().focus().setTextAlign('right').run())"
            >
              <span class="i-mingcute-align-right-line" />
            </button>
          </div>
        </el-popover>
        <button
          type="button"
          class="simple-html-editor__tool"
          :class="{ 'is-on': active.link }"
          title="链接"
          @click="insertLink"
        >
          <span class="i-tabler-link" />
        </button>
        <button
          type="button"
          class="simple-html-editor__tool"
          title="清除样式"
          @click="clearFormat"
        >
          <span class="i-tabler-eraser" />
        </button>
      </template>
      <button
        type="button"
        class="simple-html-editor__tool is-source"
        :class="{ 'is-on': sourceMode }"
        title="HTML 源码"
        @click="toggleSource"
      >
        <span class="i-tabler-code" />
      </button>
    </div>
    <el-input
      v-if="sourceMode"
      v-model="sourceText"
      class="simple-html-editor__source"
      type="textarea"
      resize="none"
      placeholder="输入 HTML"
    />
    <div
      v-show="!sourceMode"
      class="simple-html-editor__body"
    >
      <EditorContent
        v-if="editor"
        :editor="editor"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.simple-html-editor {
  display: flex;
  flex-direction: column;
  height: 212px;
  min-height: 140px;
  max-height: 70vh;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-bg-color);
  overflow: hidden;
  resize: vertical;
}

.simple-html-editor__bar {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  background: var(--vis-muted-bar, #e8eef5);
}

.simple-html-editor__split {
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: var(--el-border-color-extra-light);
}

.simple-html-editor__tool {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--el-text-color-regular);
  font-size: 16px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--el-fill-color-light);
  }

  &:disabled {
    opacity: 0.35;
    cursor: default;
  }

  &.is-on {
    background: var(--el-fill-color);
    box-shadow: inset 0 0 0 1px var(--el-border-color);
  }

  &.is-text {
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.02em;
  }

  &.is-source {
    margin-left: auto;
  }
}

.simple-html-editor__bg {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.simple-html-editor__bg-letter {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.simple-html-editor__bg-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 1px;
  background: currentColor;
}

.simple-html-editor__palette {
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
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid rgb(0 0 0 / 8%);
  border-radius: 4px;
  cursor: pointer;
}

.simple-html-editor__clear {
  align-self: flex-end;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  line-height: 1;
  color: var(--el-color-primary);
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary-light-3);
  }
}

.simple-html-editor__aligns {
  display: flex;
  justify-content: center;
}

.simple-html-editor__source {
  flex: 1 1 0;
  min-height: 0;
  height: 100%;

  :deep(.el-textarea) {
    height: 100%;
  }

  :deep(.el-textarea__inner) {
    height: 100% !important;
    min-height: 0;
    padding: 10px 12px;
    border: none;
    border-radius: 0;
    box-shadow: none;
    font-family: var(--na-font-mono);
    font-size: 12px;
    line-height: 1.55;
    resize: none;
  }
}

.simple-html-editor__body {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;

  :deep(.tiptap) {
    min-height: 100%;
    padding: 10px 12px;
    outline: none;
    font: 13px / 1.55 var(--na-font-sans);
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

    h2 {
      margin: 0 0 0.45em;
      font-size: 16px;
      font-weight: 650;
      line-height: 1.35;
    }

    h3 {
      margin: 0 0 0.4em;
      font-size: 14px;
      font-weight: 600;
      line-height: 1.35;
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

    a {
      color: var(--el-color-primary);
    }

    mark {
      padding: 0 0.12em;
      border-radius: 2px;
      color: inherit;
    }
  }
}
</style>
