<script setup lang="ts">
import { useAppStore } from '@/stores/modules/app'
import { CHROME_THEMES } from '@/theme/chrome'

const emit = defineEmits<{ close: [] }>()
const appStore = useAppStore()
const panelRef = ref<HTMLElement>()

onMounted(() => {
  panelRef.value?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true })
})
</script>

<template>
  <section ref="panelRef" class="appearance-panel" aria-label="系统外观" @keydown.esc.stop="emit('close')">
    <div class="appearance-panel__header">
      <h3>系统外观</h3>
      <button type="button" class="appearance-panel__close" aria-label="关闭外观面板" @click="emit('close')">
        <span class="i-ep-close" aria-hidden="true" />
      </button>
    </div>
    <div class="appearance-panel__grid" aria-label="选择导航配色">
      <button
        v-for="(theme, id) in CHROME_THEMES"
        :key="id"
        type="button"
        class="appearance-option"
        :aria-label="`${theme.name}配色`"
        :aria-pressed="appStore.chromeTheme === id"
        @click="appStore.setChromeTheme(id)"
      >
        <span
          class="appearance-option__preview"
          :style="{
            '--preview-navbar': theme.navbar.background,
            '--preview-navbar-border': theme.navbar.border,
            '--preview-sidebar': theme.sidebar.background,
            '--preview-active': theme.sidebar.activeText,
          }"
          aria-hidden="true"
        >
          <span class="appearance-option__navbar" />
          <span class="appearance-option__sidebar"><span /></span>
          <span class="appearance-option__content" />
        </span>
        <span class="appearance-option__label">
          <span>{{ theme.name }}</span>
          <span class="appearance-option__check i-ep-check" aria-hidden="true" />
        </span>
      </button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.appearance-panel {
  padding: 16px;
  color: var(--el-text-color-primary);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: var(--el-border-radius-base);
    background: transparent;
    color: var(--el-text-color-secondary);
    cursor: pointer;

    &:hover {
      background: var(--el-fill-color-light);
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 12px;
  }
}

.appearance-option {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  font: inherit;
  cursor: pointer;

  &[aria-pressed='true'] {
    border-color: var(--el-color-primary);
    box-shadow: inset 0 0 0 1px var(--el-color-primary);
    color: var(--el-color-primary);
  }

  &__preview {
    display: grid;
    grid-template-columns: 27px 1fr;
    grid-template-rows: 9px 53px;
    overflow: hidden;
    border: 1px solid var(--el-border-color-light);
    border-radius: 4px;
    background: var(--el-bg-color-page);
  }

  &__navbar {
    grid-column: 1 / -1;
    border-bottom: 1px solid var(--preview-navbar-border);
    background: var(--preview-navbar);
  }

  &__sidebar {
    padding: 14px 4px;
    background: var(--preview-sidebar);

    > span {
      display: block;
      height: 5px;
      border-radius: 1px;
      background: var(--preview-active);
    }
  }

  &__content {
    margin: 7px;
    border-radius: 2px;
    background: var(--el-bg-color);
  }

  &__label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-top: 6px;
    font-size: 12px;
  }

  &__check {
    visibility: hidden;
  }

  &[aria-pressed='true'] &__check {
    visibility: visible;
  }
}

@media (pointer: coarse) {
  .appearance-panel__close {
    width: 40px;
    height: 40px;
  }
}
</style>
