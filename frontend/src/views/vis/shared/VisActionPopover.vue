<script setup lang="ts">
export interface VisPopoverAction {
  key: string
  label: string
  icon?: string
  title?: string
  visible?: boolean
  disabled?: boolean
  active?: boolean
  primary?: boolean
  danger?: boolean
  attrs?: Record<string, string>
}

export interface VisActionGroup {
  id: string
  label: string
  items: VisPopoverAction[]
}

const props = withDefaults(defineProps<{
  label: string
  groups: VisActionGroup[]
  surfaceStyle?: Record<string, string>
  popperClass?: string
  touch?: boolean
}>(), { popperClass: '', touch: false })
const emit = defineEmits<{ action: [key: string] }>()
const open = defineModel<boolean>('open', { default: false })
const triggerRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()
const groups = computed(() => props.groups
  .map(group => ({ ...group, items: group.items.filter(item => item.visible !== false) }))
  .filter(group => group.items.length))

function buttons() {
  return [...(panelRef.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
}
function focusFirst() {
  if (open.value)
    buttons()[0]?.focus({ preventScroll: true })
}
function onEscape(event: KeyboardEvent) {
  if (!open.value)
    return
  event.preventDefault()
  event.stopPropagation()
  open.value = false
  void nextTick(() => triggerRef.value?.querySelector('button')?.focus({ preventScroll: true }))
}
function onNavigate(event: KeyboardEvent) {
  const items = buttons()
  const index = items.findIndex(item => item === event.target)
  if (!items.length || index < 0)
    return
  const steps: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }
  let next: number
  if (event.key === 'Home')
    next = 0
  else if (event.key === 'End')
    next = items.length - 1
  else if (event.key in steps)
    next = (index + steps[event.key]! + items.length) % items.length
  else
    return
  event.preventDefault()
  event.stopPropagation()
  items[next]?.focus()
}
function onFocusOut(event: FocusEvent) {
  const target = event.relatedTarget
  if (target instanceof Node && !panelRef.value?.contains(target) && !triggerRef.value?.contains(target))
    open.value = false
}
function choose(item: VisPopoverAction) {
  if (item.disabled)
    return
  open.value = false
  emit('action', item.key)
}
</script>

<template>
  <el-popover
    v-model:visible="open"
    trigger="click"
    placement="bottom-end"
    width="max-content"
    :show-arrow="false"
    :persistent="false"
    :popper-class="`vis-actions-popper ${popperClass}`"
    :popper-style="surfaceStyle"
    role="dialog"
    :aria-label="label"
    @after-enter="focusFirst"
  >
    <template #reference>
      <span ref="triggerRef" class="vis-actions-trigger" @keydown.down.prevent="open = true" @keydown.esc="onEscape">
        <slot />
      </span>
    </template>
    <div
      ref="panelRef"
      class="vis-actions-panel"
      :class="{ 'is-touch': touch }"
      @keydown.esc="onEscape"
      @keydown="onNavigate"
      @focusout="onFocusOut"
    >
      <div
        v-for="group in groups" :key="group.id"
        class="vis-actions-panel__group"
        role="group" :aria-label="group.label"
      >
        <button
          v-for="item in group.items" :key="item.key"
          type="button" class="vis-actions-panel__action"
          :class="{ 'is-active': item.active, 'is-primary': item.primary, 'is-danger': item.danger }"
          :disabled="item.disabled" :aria-pressed="item.active"
          :aria-label="item.title || item.label" :title="item.title"
          v-bind="item.attrs"
          @click="choose(item)"
        >
          <span v-if="item.icon" class="vis-actions-panel__icon" :class="item.icon" aria-hidden="true" />
          <span class="vis-actions-panel__label">{{ item.label }}</span>
        </button>
      </div>
    </div>
  </el-popover>
</template>

<style scoped lang="scss">
@use '@/theme/presentation.scss' as ui;

.vis-actions-trigger {
  display: inline-flex;
}
.vis-actions-panel {
  --action-height: 36px;

  &.is-touch {
    --action-height: 44px;
  }
}
.vis-actions-panel__group {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 2px;

  + .vis-actions-panel__group {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
.vis-actions-panel__action {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: var(--action-height);
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  @include ui.focus-ring;

  &:hover:not(:disabled) {
    background: var(--el-fill-color-light);
  }
  &.is-active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
  &.is-primary {
    color: var(--el-color-primary);
  }
  &.is-danger {
    color: var(--el-color-danger);
  }
  &.is-danger:hover:not(:disabled) {
    background: var(--el-color-danger-light-9);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}
.vis-actions-panel__icon {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
}
.vis-actions-panel__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (hover: none), (pointer: coarse) {
  .vis-actions-panel {
    --action-height: 44px;
  }
}
</style>

<style lang="scss">
.el-popover.el-popper.vis-actions-popper {
  z-index: 4000 !important;
  box-sizing: border-box;
  min-width: 112px;
  max-width: calc(100vw - 24px);
  max-height: min(72dvh, 620px);
  padding: 8px;
  overflow: auto;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
  box-shadow: var(--na-shadow-floating);
  color: var(--el-text-color-regular);
  overscroll-behavior: contain;
}
</style>
