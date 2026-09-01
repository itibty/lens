<!--
 * @Description: Davinci 风格字段胶囊：默认展示字段名，配置进 popover
 * 关闭 popover 时 emit confirm（由父级写回配置）；参考 ListTable 的 outside 忽略
 * 投放区排序时开 dragHandle，父级 draggable 需 handle=".field-pill__handle"
-->
<script setup lang="ts">
import { onClickOutside, useEventListener } from '@vueuse/core'

withDefaults(defineProps<{
  name: string
  /** 右侧短文案（如汇总方式、排序方向） */
  subtitle?: string
  /** 右侧 info 图标，tooltip 展示完整说明（如筛选条件文案） */
  tip?: string
  /** 校验错误：红边，文案走 tip */
  error?: string
  tone?: 'dimension' | 'metric' | 'filter' | 'source'
  removable?: boolean
  /** 投放区一行一条时占满宽度 */
  block?: boolean
  /** 左侧拖动手柄；投放区排序时开启 */
  dragHandle?: boolean
  /** 中部面板默认 360，扣 padding 后 312 */
  popoverWidth?: number | string
}>(), {
  tone: 'source',
  removable: true,
  block: false,
  dragHandle: false,
  popoverWidth: 312,
})

const emit = defineEmits<{
  remove: []
  /** 打开前：父级准备草稿 */
  open: []
  /** 关闭时：父级把草稿写回配置 */
  confirm: []
}>()

const popoverVisible = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
/** 不超过视口剩余空间；内容更矮时 scrollbar 随内容收缩 */
const scrollMaxHeight = ref(360)

const POPOVER_EDGE = 16
const POPOVER_CHROME = 8

function updateScrollMaxHeight() {
  const viewH = window.innerHeight
  const el = triggerRef.value
  if (!el) {
    scrollMaxHeight.value = Math.max(viewH - POPOVER_EDGE * 2, 200)
    return
  }
  const rect = el.getBoundingClientRect()
  const below = viewH - rect.bottom - POPOVER_EDGE
  const above = rect.top - POPOVER_EDGE
  scrollMaxHeight.value = Math.max(Math.max(below, above) - POPOVER_CHROME, 200)
}

function openPopover() {
  emit('open')
  updateScrollMaxHeight()
  popoverVisible.value = true
}

function closeAndConfirm() {
  if (!popoverVisible.value)
    return
  emit('confirm')
  popoverVisible.value = false
}

function togglePopover() {
  if (popoverVisible.value)
    closeAndConfirm()
  else
    openPopover()
}

onClickOutside(
  panelRef,
  () => {
    closeAndConfirm()
  },
  {
    ignore: [
      triggerRef,
      '.el-select__popper',
      '.el-picker__popper',
      '.el-popper',
      '.el-scrollbar__bar',
    ],
  },
)

useEventListener(window, 'resize', () => {
  if (popoverVisible.value)
    updateScrollMaxHeight()
})
useEventListener(window, 'scroll', () => {
  if (popoverVisible.value)
    updateScrollMaxHeight()
}, { capture: true, passive: true })
</script>

<template>
  <el-popover
    :visible="popoverVisible"
    placement="bottom-start"
    :width="popoverWidth"
    :persistent="true"
    :show-arrow="true"
    popper-class="vis-field-pill-popper"
  >
    <template #reference>
      <div
        ref="triggerRef"
        class="field-pill-trigger"
        :class="{ 'is-block': block }"
        @click.stop="togglePopover"
      >
        <div
          class="field-pill"
          :class="[`is-${tone}`, { 'is-active': popoverVisible, 'is-block': block, 'is-invalid': !!error, 'has-handle': dragHandle }]"
          draggable="false"
        >
          <span
            v-if="dragHandle"
            class="field-pill__handle"
            title="拖动排序"
            @click.stop
          >
            <span class="field-pill__handle-icon i-tabler-grip-vertical" />
          </span>
          <span class="field-pill__name ellipsis" :title="name">{{ name }}</span>
          <el-tooltip
            v-if="error || tip"
            :content="error || tip"
            placement="top"
            :show-after="200"
          >
            <span
              class="field-pill__tip"
              :class="{ 'is-error': !!error }"
              @click.stop
            >
              <span class="field-pill__tip-icon i-mingcute-information-line" />
            </span>
          </el-tooltip>
          <span
            v-else-if="subtitle"
            class="field-pill__sub ellipsis"
            :title="subtitle"
          >{{ subtitle }}</span>
          <span
            v-if="removable"
            class="field-pill__close"
            title="移除"
            @click.stop="emit('remove')"
          >
            <span class="field-pill__close-icon i-mingcute-minimize-line" />
          </span>
        </div>
      </div>
    </template>
    <div
      ref="panelRef"
      class="field-pill-config"
      @mousedown.stop
      @click.stop
    >
      <el-scrollbar
        class="field-pill-config__scroll"
        view-class="field-pill-config__view"
        :max-height="scrollMaxHeight"
      >
        <slot />
      </el-scrollbar>
    </div>
  </el-popover>
</template>

<style scoped lang="scss">
.field-pill-trigger {
  display: inline-block;
  max-width: 100%;

  &.is-block {
    display: block;
    width: 100%;
  }
}

.field-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 8px 0 10px;
  border-radius: 4px;
  border: 1px solid transparent;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;

  &.is-block {
    display: flex;
    width: 100%;
  }

  &.has-handle {
    padding-left: 6px;
  }

  &.is-active {
    box-shadow: 0 0 0 1px var(--el-color-primary);
  }

  &__handle {
    flex-shrink: 0;
    width: 16px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0.45;
    cursor: grab;
    touch-action: none;

    &:hover {
      opacity: 0.8;
    }

    &:active {
      cursor: grabbing;
      opacity: 1;
    }
  }

  &__handle-icon {
    width: 14px;
    height: 14px;
    pointer-events: none;
  }

  &__name {
    flex: 1;
    min-width: 0;
    font-weight: 500;
  }

  &__sub {
    flex-shrink: 0;
    max-width: 42%;
    opacity: 0.75;
    font-size: 11px;
  }

  &__tip {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    color: var(--el-text-color-secondary);
    cursor: help;
    outline: none;

    &:hover {
      color: var(--el-color-primary);
    }

    &.is-error {
      color: var(--el-color-danger);

      &:hover {
        color: var(--el-color-danger);
      }
    }
  }

  &__tip-icon {
    font-size: 14px;
    line-height: 1;
  }

  &__close {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    opacity: 0.55;
    cursor: pointer;
    transition:
      background 0.15s ease,
      opacity 0.15s ease;

    &:hover {
      opacity: 1;
      background: rgb(0 0 0 / 8%);
    }
  }

  &__close-icon {
    font-size: 13px;
    line-height: 1;
  }

  &.is-source {
    width: 100%;
    justify-content: flex-start;
    background: var(--el-fill-color-light);
    border-color: var(--el-border-color-lighter);
    color: var(--el-text-color-primary);
  }

  &.is-dimension {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
    color: var(--el-color-primary);
  }

  &.is-metric {
    background: var(--el-color-success-light-9);
    border-color: var(--el-color-success-light-5);
    color: var(--el-color-success);
  }

  &.is-filter {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-5);
    color: var(--el-color-primary);
  }

  &.is-invalid {
    border-color: var(--el-color-danger);
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }

  &.is-invalid.is-active {
    box-shadow: 0 0 0 1px var(--el-color-danger);
  }
}

.field-pill-config {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: 100%;
  box-sizing: border-box;

  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-form-item:not(.el-form-item--label-left) .el-form-item__label) {
    margin-bottom: 4px !important;
    line-height: 1.3;
  }

  :deep(.el-form-item--label-left) {
    align-items: center;

    .el-form-item__label {
      margin-bottom: 0 !important;
      padding-right: 10px;
      line-height: 1.3;
      height: auto;
    }

    .el-form-item__content {
      margin-left: 0 !important;
      justify-content: flex-end;
    }
  }

  :deep(.el-form-item:last-child) {
    margin-bottom: 0;
  }

  :deep(.el-select),
  :deep(.el-input),
  :deep(.el-input-number),
  :deep(.el-date-editor),
  :deep(.el-textarea) {
    width: 100%;
    max-width: 100%;
  }

  :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
    max-width: 100%;
  }
}
</style>

<style lang="scss">
.vis-field-pill-popper {
  max-width: min(360px, calc(100vw - 24px));
  max-height: calc(100vh - 16px);
  // 四边 padding 都进滚动内容，滑块贴顶、底、右
  padding: 0 !important;
  box-sizing: border-box;

  .el-popper__arrow {
    display: block;
  }

  .field-pill-config {
    min-width: 0;
  }

  .field-pill-config__view {
    padding: 10px 12px;
    box-sizing: border-box;
  }

  .el-scrollbar__bar.is-vertical {
    top: 0;
    right: 0;
    bottom: 0;
  }
}
</style>
