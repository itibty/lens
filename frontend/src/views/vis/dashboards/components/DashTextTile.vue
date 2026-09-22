<!--
 * @Description: 看板原生富文本标注。无查询、卡片 id 或卡片级操作。
-->
<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { DashTextAppearance, DashTextDraft, DashTextWidget } from '../dashLayout'
import type { DashFlowMode } from '../dashPresentation'
import SimpleHtmlEditor from '@/views/vis/cards/components/SimpleHtmlEditor.vue'
import { sanitizeRichText } from '@/views/vis/shared/sanitizeRichText'
import { trackDashGlassPointer } from '../dashTheme'
import DashTextSettings from './DashTextSettings.vue'

const props = withDefaults(defineProps<{
  widget: DashTextWidget
  editable?: boolean
  designActions?: boolean
  resizing?: boolean
  flowMode?: DashFlowMode
}>(), {
  editable: false,
  designActions: false,
  resizing: false,
  flowMode: undefined,
})

const emit = defineEmits<{
  'update:draft': [draft: DashTextDraft]
  'copy': []
  'remove': []
  'resizeStart': [corner: 'nw' | 'ne' | 'sw' | 'se', event: PointerEvent]
}>()

const safeHtml = computed(() => sanitizeRichText(props.widget.html))
const editorHtml = computed<string | undefined>({
  get: () => safeHtml.value || undefined,
  set: value => emitDraft(sanitizeRichText(value), props.widget.appearance),
})

function emitDraft(html: string, appearance: DashTextAppearance) {
  emit('update:draft', {
    html,
    appearance,
  })
}

function updateAppearance(appearance: DashTextAppearance) {
  emitDraft(safeHtml.value, appearance)
}
const tileStyle = computed<CSSProperties>(() => {
  const { appearance } = props.widget
  return {
    'backgroundColor': appearance.bg || 'var(--dash-card-bg, var(--el-bg-color))',
    'backgroundImage': appearance.bg ? 'none' : 'var(--dash-card-glaze, none)',
    'color': appearance.color || 'var(--dash-content-color, var(--el-text-color-primary))',
    '--annotation-vertical-align': appearance.verticalAlign,
    '--dash-text-padding': `${appearance.insets?.top ?? 0}px ${appearance.insets?.right ?? 0}px ${appearance.insets?.bottom ?? 0}px ${appearance.insets?.left ?? 0}px`,
  }
})

function onResizePointerDown(corner: 'nw' | 'ne' | 'sw' | 'se', event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  emit('resizeStart', corner, event)
}
</script>

<template>
  <div
    class="dash-tile dash-text"
    :class="[
      `is-align-${widget.appearance.verticalAlign}`,
      {
        'has-design-actions': designActions,
        'is-editable': editable,
        'is-resizing': resizing,
        'is-flow': !!flowMode,
        [`is-flow-${flowMode}`]: !!flowMode,
      },
    ]"
    :style="tileStyle"
    @pointermove="trackDashGlassPointer"
  >
    <template v-if="editable">
      <div class="dash-tile__handle" title="拖动">
        <span class="dash-tile__handle-icon i-mingcute-dots-vertical-line" />
      </div>
      <i class="dash-tile__dot dash-tile__dot--tl" @pointerdown="onResizePointerDown('nw', $event)" />
      <i class="dash-tile__dot dash-tile__dot--tr" @pointerdown="onResizePointerDown('ne', $event)" />
      <i class="dash-tile__dot dash-tile__dot--bl" @pointerdown="onResizePointerDown('sw', $event)" />
      <i class="dash-tile__dot dash-tile__dot--br" @pointerdown="onResizePointerDown('se', $event)" />
    </template>
    <div v-if="designActions" class="dash-text__actions">
      <el-popover
        placement="bottom-end"
        trigger="click"
        :width="276"
        :show-arrow="false"
        :teleported="true"
      >
        <template #reference>
          <button type="button" title="标注设置" @click.stop>
            <span class="i-mingcute-settings-3-line" />
          </button>
        </template>
        <DashTextSettings
          :appearance="widget.appearance"
          @update:appearance="updateAppearance"
        />
      </el-popover>
      <el-tooltip content="复制" placement="top" :show-after="200">
        <button type="button" aria-label="复制标注" @click.stop="emit('copy')">
          <span class="i-mingcute-copy-2-line" />
        </button>
      </el-tooltip>
      <el-tooltip content="删除" placement="top" :show-after="200">
        <button type="button" @click.stop="emit('remove')">
          <span class="i-mingcute-delete-2-line" />
        </button>
      </el-tooltip>
    </div>
    <div class="dash-tile__body dash-text__body">
      <SimpleHtmlEditor
        v-if="designActions"
        v-model="editorHtml"
        embedded
        annotation
        class="dash-text__editor"
      />
      <div v-else class="dash-text__content" v-html="safeHtml" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '../dashPage.scss' as page;

.dash-text {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  border: var(--vis-card-border);
  border-radius: var(--dash-card-radius, 12px);

  @include page.frost(card);

  &.is-editable:hover,
  &.is-editable:focus-within,
  &.is-resizing {
    outline: 3px solid
      color-mix(in srgb, var(--dash-accent, var(--na-color-primary)) 68%, var(--dash-card-bg, var(--na-surface-bg)));
    outline-offset: -1px;
  }
}

.dash-text.is-flow {
  height: auto;
  min-height: inherit;
  border: 1px solid color-mix(in srgb, var(--dash-border, var(--na-border-color-light)) 48%, transparent);

  .dash-text__body {
    height: auto;
    min-height: inherit;
    overflow: visible;
  }

  .dash-text__content {
    font-size: 14px;
    line-height: 1.72;
  }

  .dash-text__content :deep(h1) {
    font-size: clamp(21px, 6vw, 24px);
  }

  .dash-text__content :deep(h2) {
    font-size: clamp(18px, 5vw, 20px);
  }

  .dash-text__content :deep(h3) {
    font-size: clamp(16px, 4.4vw, 17px);
  }
}

.dash-text__body {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: var(--dash-text-padding, 0);
  overflow: auto;
  border-radius: inherit;
  scrollbar-width: thin;
}

.is-align-start .dash-text__body {
  align-items: flex-start;
}

.is-align-center .dash-text__body {
  align-items: center;
}

.is-align-end .dash-text__body {
  align-items: flex-end;
}

.dash-text__content {
  width: 100%;
  min-width: 0;
  display: flow-root;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.65;

  :deep(p) {
    margin: 0 0 0.6em;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    margin: 0 0 0.45em;
    line-height: 1.35;
  }

  :deep(h1) {
    font-size: 24px;
  }

  :deep(h2) {
    font-size: 20px;
  }

  :deep(h3) {
    font-size: 17px;
  }

  :deep(h4) {
    font-size: 15px;
  }

  :deep(h5),
  :deep(h6) {
    font-size: 13px;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 0.6em 1.35em;
    padding: 0;
  }

  :deep(ul) {
    list-style: disc;
  }

  :deep(ol) {
    list-style: decimal;
  }

  :deep(blockquote) {
    margin: 0 0 0.6em;
    padding-left: 0.8em;
    border-left: 3px solid var(--dash-border, var(--el-border-color));
    color: var(--dash-content-muted, var(--el-text-color-regular));
  }

  :deep(a) {
    color: var(--dash-accent, var(--el-color-primary));
  }

  :deep(hr) {
    margin: 0.8em 0;
    border: none;
    border-top: 1px solid var(--dash-border, var(--el-border-color));
  }

  :deep(mark) {
    padding: 0 0.12em;
    border-radius: 2px;
    color: inherit;
  }
}

.dash-text__editor {
  width: 100%;
  min-width: 0;
  display: flow-root;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.65;
  user-select: text;

  :deep(.tiptap h1) {
    font-size: 24px;
  }

  :deep(.tiptap h2) {
    font-size: 20px;
  }

  :deep(.tiptap h3) {
    font-size: 17px;
  }

  :deep(.tiptap h4) {
    font-size: 15px;
  }

  :deep(.tiptap h5) {
    font-size: 13px;
  }
}

// 只给首行标题避让卡片操作，正文保持完整宽度，不额外占用顶部高度。
.dash-text.has-design-actions {
  :deep(.simple-html-editor__prose > :first-child:not(blockquote)),
  :deep(.simple-html-editor__prose > blockquote:first-child > :first-child) {
    padding-right: 90px;
  }
}

.dash-text__content {
  :deep(> p:last-child:empty) {
    display: none;
  }
}

.dash-text__actions {
  position: absolute;
  top: 0;
  right: 4px;
  z-index: 7;
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid color-mix(in srgb, var(--dash-border, var(--na-border-color-light)) 72%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--dash-card-bg, var(--na-surface-bg)) 92%, transparent);
  box-shadow: 0 4px 14px rgb(15 23 42 / 10%);

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--dash-content-muted, var(--el-text-color-regular));
    cursor: pointer;

    &:hover {
      background: color-mix(in srgb, var(--dash-accent, var(--na-color-primary)) 10%, transparent);
      color: var(--dash-accent, var(--na-color-primary));
    }
  }
}

.dash-tile__handle {
  position: absolute;
  top: 0;
  left: 50%;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 26px;
  transform: translateX(-50%);
  cursor: grab;
  opacity: 0;
  pointer-events: none;

  &:active {
    cursor: grabbing;
  }
}

.dash-tile__handle-icon {
  width: 34px;
  height: 24px;
  color: var(--dash-content-muted, var(--na-text-muted));
}

.dash-tile__dot {
  --dash-dot-inset: calc(var(--dash-card-radius, 14px) * 0.16 - 8px);

  position: absolute;
  z-index: 6;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  border: 2px solid var(--dash-card-bg, var(--na-surface-bg));
  border-radius: 50%;
  background: var(--dash-accent, var(--na-color-primary));
  touch-action: none;
  opacity: 0;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    inset: -6px;
  }
}

.dash-text.is-editable:hover,
.dash-text.is-editable:focus-within,
.dash-text.is-resizing {
  .dash-tile__handle,
  .dash-tile__dot {
    opacity: 1;
    pointer-events: auto;
  }
}

.dash-tile__dot--tl {
  top: var(--dash-dot-inset);
  left: var(--dash-dot-inset);
  cursor: nwse-resize;
}

.dash-tile__dot--tr {
  top: var(--dash-dot-inset);
  right: var(--dash-dot-inset);
  cursor: nesw-resize;
}

.dash-tile__dot--bl {
  bottom: var(--dash-dot-inset);
  left: var(--dash-dot-inset);
  cursor: nesw-resize;
}

.dash-tile__dot--br {
  right: var(--dash-dot-inset);
  bottom: var(--dash-dot-inset);
  cursor: nwse-resize;
}
</style>
