<!--
 * @Description: 文本卡片轻量编辑器（可视 / HTML 源码，不引入富文本库）
-->
<script setup lang="ts">
type ColorCommand = 'foreColor' | 'hiliteColor'

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

const editorRef = ref<HTMLElement>()
const focused = ref(false)
const sourceMode = ref(false)
const active = reactive({
  bold: false,
  italic: false,
  list: false,
})

let savedRange: Range | null = null

function isEmptyHtml(raw?: string) {
  if (!raw?.trim())
    return true
  if (/<(?:img|hr|table|video)\b/i.test(raw))
    return false
  const text = raw.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;/gi, ' ').replace(/<[^>]+>/g, '').trim()
  return !text
}

const sourceText = computed({
  get: () => html.value ?? '',
  set: (value: string) => {
    html.value = isEmptyHtml(value) ? undefined : value
  },
})

function currentHtml() {
  return editorRef.value?.innerHTML ?? ''
}

function writeModel() {
  if (sourceMode.value)
    return
  const next = currentHtml()
  html.value = isEmptyHtml(next) ? undefined : next
}

function paintEditor(next?: string) {
  const el = editorRef.value
  if (!el)
    return
  const value = next ?? ''
  if (el.innerHTML === value)
    return
  el.innerHTML = value
}

function rememberRange() {
  if (sourceMode.value)
    return
  const sel = document.getSelection()
  if (!sel || !sel.rangeCount || !editorRef.value?.contains(sel.anchorNode)) {
    savedRange = null
    return
  }
  savedRange = sel.getRangeAt(0)
}

function restoreRange() {
  const el = editorRef.value
  if (!el)
    return
  el.focus()
  const sel = document.getSelection()
  if (!sel)
    return
  sel.removeAllRanges()
  if (savedRange)
    sel.addRange(savedRange)
}

function run(command: string, value?: string) {
  if (sourceMode.value)
    return
  restoreRange()
  document.execCommand('styleWithCSS', false, 'true')
  document.execCommand(command, false, value)
  syncActive()
  writeModel()
}

function applyColor(command: ColorCommand, color?: string) {
  if (!color) {
    run(command, command === 'hiliteColor' ? 'transparent' : 'inherit')
    return
  }
  run(command, color)
}

function syncActive() {
  if (sourceMode.value || (!focused.value && !editorRef.value?.contains(document.activeElement))) {
    active.bold = false
    active.italic = false
    active.list = false
    return
  }
  active.bold = document.queryCommandState('bold')
  active.italic = document.queryCommandState('italic')
  active.list = document.queryCommandState('insertUnorderedList')
}

async function insertLink() {
  if (sourceMode.value)
    return
  rememberRange()
  try {
    const { value } = await ElMessageBox.prompt('链接地址', '插入链接', {
      inputPlaceholder: 'https://',
      inputPattern: /^https?:\/\/.+/i,
      inputErrorMessage: '请输入 http(s) 地址',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })
    run('createLink', value.trim())
  }
  catch {
    restoreRange()
  }
}

function toggleSource() {
  if (!sourceMode.value)
    writeModel()
  sourceMode.value = !sourceMode.value
  focused.value = false
  savedRange = null
  if (!sourceMode.value)
    void nextTick(() => paintEditor(html.value))
  void nextTick(() => {
    const el = document.activeElement
    if (el instanceof HTMLElement)
      el.blur()
  })
}

function onPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') ?? ''
  document.execCommand('insertText', false, text)
  writeModel()
}

function onSelectionChange() {
  rememberRange()
  syncActive()
}

onMounted(() => {
  paintEditor(html.value)
  document.addEventListener('selectionchange', onSelectionChange)
})

onUnmounted(() => {
  document.removeEventListener('selectionchange', onSelectionChange)
})

watch(html, (next) => {
  if (focused.value || sourceMode.value)
    return
  paintEditor(next)
})
</script>

<template>
  <div class="simple-html-editor">
    <div
      class="simple-html-editor__bar"
      @mousedown.prevent
    >
      <template v-if="!sourceMode">
        <button
          type="button"
          class="simple-html-editor__tool"
          :class="{ 'is-on': active.bold }"
          title="加粗"
          @click="run('bold')"
        >
          <span class="i-mingcute-bold-line" />
        </button>
        <button
          type="button"
          class="simple-html-editor__tool"
          :class="{ 'is-on': active.italic }"
          title="斜体"
          @click="run('italic')"
        >
          <span class="i-mingcute-italic-line" />
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
                @click="applyColor('foreColor', color)"
              />
            </div>
            <button
              type="button"
              class="simple-html-editor__clear"
              @click="applyColor('foreColor')"
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
                @click="applyColor('hiliteColor', color)"
              />
            </div>
            <button
              type="button"
              class="simple-html-editor__clear"
              @click="applyColor('hiliteColor')"
            >
              清空
            </button>
          </div>
        </el-popover>
        <button
          type="button"
          class="simple-html-editor__tool"
          :class="{ 'is-on': active.list }"
          title="列表"
          @click="run('insertUnorderedList')"
        >
          <span class="i-tabler-list" />
        </button>
        <button
          type="button"
          class="simple-html-editor__tool"
          title="链接"
          @click="insertLink"
        >
          <span class="i-tabler-link" />
        </button>
        <button
          type="button"
          class="simple-html-editor__tool"
          title="清除样式"
          @click="run('removeFormat')"
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
      v-else
      ref="editorRef"
      class="simple-html-editor__body"
      :class="{ 'is-empty': isEmptyHtml(html) }"
      contenteditable="true"
      data-placeholder="输入说明文字"
      @focus="focused = true"
      @blur="focused = false; writeModel()"
      @input="writeModel"
      @paste="onPaste"
    />
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
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-extra-light);
  background: var(--vis-muted-bar, #e8eef5);
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

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.is-on {
    background: var(--el-fill-color);
    box-shadow: inset 0 0 0 1px var(--el-border-color);
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
  padding: 10px 12px;
  overflow: auto;
  font: 13px / 1.55 var(--na-font-sans);
  color: var(--el-text-color-primary);
  outline: none;

  &.is-empty::before {
    content: attr(data-placeholder);
    color: var(--el-text-color-placeholder);
    pointer-events: none;
  }

  :deep(ul) {
    margin: 0 0 0 1.25em;
    padding: 0;
    list-style: disc;
  }

  :deep(a) {
    color: var(--el-color-primary);
  }
}
</style>
