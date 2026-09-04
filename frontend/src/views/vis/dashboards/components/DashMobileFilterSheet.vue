<!--
 * @Description: 移动看板筛选面板；面板内只改草稿，统一应用时才写回筛选值。
-->
<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { DashFilterValue, DashFilterValues, VisDashFilterDef } from '../dashApi'
import {
  dashFilterOpText,
  filterValueReady,
  isBlankFilterValue,
  snapshotFilterValue,
} from '../dashApi'
import DashFilterChipFields from './DashFilterChipFields.vue'

const props = withDefaults(defineProps<{
  defs: VisDashFilterDef[]
  dashboardId?: string
  surfaceStyle?: CSSProperties
}>(), {
  dashboardId: '',
  surfaceStyle: undefined,
})

const open = defineModel<boolean>('open', { default: false })
const values = defineModel<DashFilterValues>('values', { required: true })
const draft = ref<DashFilterValues>({})

function snapshotValues(source: DashFilterValues) {
  return Object.fromEntries(
    Object.entries(source).map(([uid, item]) => [uid, snapshotFilterValue(item)]),
  )
}

function resetDraft() {
  draft.value = snapshotValues(values.value)
}

function workingOf(uid: string) {
  return snapshotFilterValue(draft.value[uid])
}

function patch(uid: string, next: DashFilterValue) {
  draft.value = {
    ...draft.value,
    [uid]: { ...workingOf(uid), ...next },
  }
}

function clearDraft() {
  draft.value = {}
}

function applyDraft() {
  const next: DashFilterValues = {}
  for (const def of props.defs) {
    const item = snapshotFilterValue(draft.value[def.uid])
    if (!isBlankFilterValue(item))
      next[def.uid] = item
  }
  values.value = next
  open.value = false
}

function labelOf(def: VisDashFilterDef) {
  return def.label?.trim() || def.field
}

const draftFilledCount = computed(() => {
  return props.defs.filter(def => filterValueReady(def, draft.value[def.uid])).length
})
const draftHasValue = computed(() => {
  return props.defs.some(def => !isBlankFilterValue(snapshotFilterValue(draft.value[def.uid])))
})

watch(open, (visible) => {
  if (visible)
    resetDraft()
})
</script>

<template>
  <el-drawer
    v-model="open"
    class="dash-mobile-filter-sheet"
    direction="btt"
    size="min(84dvh, 720px)"
    :with-header="false"
    :append-to-body="true"
    :lock-scroll="true"
    :destroy-on-close="true"
    title="筛选条件"
    :style="surfaceStyle"
  >
    <div class="mobile-filter-sheet">
      <div class="mobile-filter-sheet__handle" aria-hidden="true" />
      <header class="mobile-filter-sheet__header">
        <div class="mobile-filter-sheet__heading">
          <strong>筛选条件</strong>
          <span v-if="draftFilledCount">{{ `已启用 ${draftFilledCount} 项` }}</span>
        </div>
        <button
          type="button"
          class="mobile-filter-sheet__close"
          aria-label="关闭筛选"
          @click="open = false"
        >
          <span class="i-mingcute-close-line" />
        </button>
      </header>

      <div class="mobile-filter-sheet__body">
        <section
          v-for="def in defs"
          :key="def.uid"
          class="mobile-filter-sheet__item"
        >
          <div class="mobile-filter-sheet__label">
            <span>{{ labelOf(def) }}</span>
            <small>{{ dashFilterOpText(def) }}</small>
          </div>
          <DashFilterChipFields
            class="mobile-filter-sheet__fields"
            :def="def"
            :item="workingOf(def.uid)"
            :op-label="dashFilterOpText(def)"
            :dashboard-id="dashboardId"
            :popper-style="surfaceStyle"
            bare
            @patch="(next) => patch(def.uid, next)"
          />
        </section>
      </div>

      <footer class="mobile-filter-sheet__footer">
        <el-button
          class="mobile-filter-sheet__action"
          :disabled="!draftHasValue"
          @click="clearDraft"
        >
          清空
        </el-button>
        <el-button class="mobile-filter-sheet__action" type="primary" @click="applyDraft">
          应用
        </el-button>
      </footer>
    </div>
  </el-drawer>
</template>

<style scoped lang="scss">
.mobile-filter-sheet {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  background: var(--dash-mobile-surface, var(--el-bg-color));
  color: var(--dash-mobile-content, var(--el-text-color-primary));
}

.mobile-filter-sheet__handle {
  flex-shrink: 0;
  width: 36px;
  height: 4px;
  margin: 8px auto 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dash-mobile-muted, var(--el-text-color-secondary)) 34%, transparent);
}

.mobile-filter-sheet__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  padding: 4px 12px 8px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--dash-mobile-border, var(--el-border-color)) 54%, transparent);
  box-sizing: border-box;
}

.mobile-filter-sheet__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    color: var(--dash-mobile-title, var(--el-text-color-primary));
    font-size: 18px;
    font-weight: 650;
    line-height: 1.25;
    letter-spacing: -0.01em;
  }

  span {
    color: var(--dash-mobile-muted, var(--el-text-color-secondary));
    font-size: 12px;
    line-height: 1.25;
  }
}

.mobile-filter-sheet__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--dash-mobile-soft, transparent);
  color: var(--dash-mobile-content, var(--el-text-color-regular));
  cursor: pointer;
  outline: none;

  &:active {
    border-color: color-mix(in srgb, var(--dash-mobile-border, var(--el-border-color)) 68%, transparent);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--dash-mobile-accent, var(--el-color-primary)) 58%, transparent);
    outline-offset: 2px;
  }

  > span {
    width: 20px;
    height: 20px;
  }
}

.mobile-filter-sheet__body {
  flex: 1 1 0;
  min-height: 0;
  padding: 6px 16px 20px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.mobile-filter-sheet__item {
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--dash-mobile-border, var(--el-border-color)) 46%, transparent);
  border-radius: 12px;
  background: var(--dash-mobile-lighter, var(--el-fill-color-lighter));

  & + & {
    margin-top: 10px;
  }
}

.mobile-filter-sheet__label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;

  > span {
    overflow: hidden;
    color: var(--dash-mobile-title, var(--el-text-color-primary));
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    flex-shrink: 0;
    padding: 2px 6px;
    border-radius: 999px;
    background: var(--dash-mobile-soft, var(--el-fill-color-light));
    color: var(--dash-mobile-muted, var(--el-text-color-secondary));
    font-size: 12px;
    font-weight: 400;
  }
}

.mobile-filter-sheet__fields {
  :deep(.el-form-item__label) {
    display: none;
  }

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper),
  :deep(.el-input-tag__wrapper),
  :deep(.el-date-editor.el-input__wrapper) {
    min-height: 44px;
    border-radius: 10px;
  }
}

.mobile-filter-sheet__footer {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 10px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid color-mix(in srgb, var(--dash-mobile-border, var(--el-border-color)) 58%, transparent);
  background: var(--dash-mobile-surface, var(--el-bg-color));
}

.mobile-filter-sheet__action {
  width: 100%;
  min-height: 44px;
  margin: 0;
  border-radius: 10px;
  font-weight: 600;

  &:not(.el-button--primary) {
    border-color: color-mix(in srgb, var(--dash-mobile-border, var(--el-border-color)) 64%, transparent);
    background: var(--dash-mobile-soft, var(--el-fill-color-light));
    color: var(--dash-mobile-content, var(--el-text-color-regular));
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--dash-mobile-accent, var(--el-color-primary)) 58%, transparent);
    outline-offset: 2px;
  }

  &.is-disabled {
    opacity: 0.56;
  }
}
</style>

<style lang="scss">
.dash-mobile-filter-sheet {
  display: flex;
  max-height: calc(100dvh - env(safe-area-inset-top));
  overflow: hidden;
  border: 1px solid var(--dash-mobile-border, var(--el-border-color-light));
  border-bottom: 0;
  border-radius: 18px 18px 0 0;
  background: var(--dash-mobile-surface, var(--el-bg-color));
  box-shadow: var(--dash-mobile-sheet-shadow, 0 -8px 24px rgb(15 23 42 / 10%));
  color: var(--dash-mobile-content, var(--el-text-color-regular));

  .el-drawer__body {
    display: flex;
    flex: 1;
    min-height: 0;
    padding: 0;
    background: inherit;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dash-mobile-filter-sheet {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
</style>
