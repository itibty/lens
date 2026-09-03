<!--
 * @Description: 看板原生富文本标注。无查询、卡片 id 或卡片级操作。
-->
<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { DashTextAppearance, DashTextWidget } from '../dashLayout'
import SimpleHtmlEditor from '@/views/vis/cards/components/SimpleHtmlEditor.vue'
import { sanitizeRichText } from '@/views/vis/shared/sanitizeRichText'
import DashTextSettings from './DashTextSettings.vue'

const props = withDefaults(defineProps<{
  widget: DashTextWidget
  editable?: boolean
  designActions?: boolean
  resizing?: boolean
}>(), {
  editable: false,
  designActions: false,
  resizing: false,
})

const emit = defineEmits<{
  'update:html': [html: string]
  'update:appearance': [appearance: DashTextAppearance]
  'remove': []
  'resizeStart': [corner: 'nw' | 'ne' | 'sw' | 'se', event: PointerEvent]
}>()

const safeHtml = computed(() => sanitizeRichText(props.widget.html))
const editorHtml = computed<string | undefined>({
  get: () => props.widget.html || undefined,
  set: value => emit('update:html', sanitizeRichText(value)),
})
const tileStyle = computed<CSSProperties>(() => {
  const { appearance } = props.widget
  return {
    background: appearance.bg || 'var(--dash-card-bg, var(--el-bg-color))',
    color: appearance.color || 'var(--dash-content-color, var(--el-text-color-primary))',
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
    class="dash-tile dash-text is-card"
    :class="[
      `is-padding-${widget.appearance.padding}`,
      `is-align-${widget.appearance.verticalAlign}`,
      {
        'is-editable': editable,
        'is-resizing': resizing,
      },
    ]"
    :style="tileStyle"
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
          @update:appearance="emit('update:appearance', $event)"
        />
      </el-popover>
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
  border-radius: var(--dash-card-radius, 12px);

  &.is-card {
    @include page.frost(card);
  }

  &.is-editable:hover,
  &.is-editable:focus-within,
  &.is-resizing {
    outline: 3px solid color-mix(in srgb, var(--dash-accent, #0052d9) 68%, var(--dash-card-bg, #fff));
    outline-offset: -1px;
  }
}

.dash-text__body {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow: auto;
  border-radius: inherit;
  scrollbar-width: thin;
}

.is-padding-sm .dash-text__body {
  padding: 8px 10px;
}

.is-padding-md .dash-text__body {
  padding: 14px 16px;
}

.is-padding-lg .dash-text__body {
  padding: 22px 24px;
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

.dash-text__actions {
  position: absolute;
  top: 7px;
  right: 8px;
  z-index: 7;
  display: flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--dash-border, #e5e7eb) 72%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--dash-card-bg, #fff) 92%, transparent);
  box-shadow: 0 4px 14px rgb(15 23 42 / 10%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--dash-content-muted, var(--el-text-color-regular));
    cursor: pointer;

    &:hover {
      background: color-mix(in srgb, var(--dash-accent, #0052d9) 10%, transparent);
      color: var(--dash-accent, #0052d9);
    }
  }
}

.dash-text:hover .dash-text__actions,
.dash-text:focus-within .dash-text__actions {
  opacity: 1;
  pointer-events: auto;
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
  color: var(--dash-content-muted, #646a73);
}

.dash-tile__dot {
  --dash-dot-inset: calc(var(--dash-card-radius, 14px) * 0.16 - 8px);

  position: absolute;
  z-index: 6;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  border: 2px solid var(--dash-card-bg, #fff);
  border-radius: 50%;
  background: var(--dash-accent, #0052d9);
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
