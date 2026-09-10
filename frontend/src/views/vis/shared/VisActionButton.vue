<!-- 看板工具栏和卡片共用的图标按钮；原生 button 保留键盘、disabled 和事件行为。 -->
<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  size?: 'compact' | 'regular' | 'touch'
  variant?: 'ghost' | 'outline'
  active?: boolean
}>(), {
  size: 'compact',
  variant: 'ghost',
  active: false,
})
</script>

<template>
  <button
    type="button"
    class="vis-action-button"
    :class="[`is-${size}`, `is-${variant}`, { 'is-active': active }]"
    :aria-label="label"
  >
    <slot />
  </button>
</template>

<style scoped lang="scss">
@use '@/theme/presentation.scss' as ui;

.vis-action-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: var(--vis-control-compact);
  height: var(--vis-control-compact);
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--vis-radius-control);
  background: transparent;
  color: var(--vis-content-color, var(--na-text-muted));
  font: inherit;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  @include ui.focus-ring;

  &.is-regular {
    width: var(--vis-control-size);
    height: var(--vis-control-size);
  }

  &.is-touch {
    --vis-icon-size: 18px;
    width: var(--vis-control-touch);
    height: var(--vis-control-touch);
  }

  &.is-outline {
    border-color: var(--na-border-color-light);
    background: var(--na-surface-bg);
    color: var(--na-text-regular);
  }

  &:hover:not(:disabled),
  &:active:not(:disabled),
  &.is-active {
    background: var(--na-fill-color-light);
    color: var(--vis-content-color, var(--na-text-strong));
  }

  &.is-active {
    border-color: var(--na-color-primary-border);
    color: var(--na-color-primary);
  }

  &.is-ghost.is-active {
    border-color: transparent;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  :slotted(span) {
    width: var(--vis-icon-size);
    height: var(--vis-icon-size);
  }

  @media (hover: none), (pointer: coarse) {
    --vis-icon-size: 18px;
    min-width: var(--vis-control-touch);
    min-height: var(--vis-control-touch);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
</style>
