<!--
 * @Description: 移动看板筛选面板；面板内只改草稿，统一应用时才写回筛选值。
-->
<script setup lang="ts">
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
}>(), {
  dashboardId: '',
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
  >
    <div class="mobile-filter-sheet">
      <header class="mobile-filter-sheet__header">
        <div class="mobile-filter-sheet__heading">
          <strong>筛选</strong>
          <span v-if="draftFilledCount">已选 {{ draftFilledCount }} 项</span>
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
            bare
            @patch="(next) => patch(def.uid, next)"
          />
        </section>
      </div>

      <footer class="mobile-filter-sheet__footer">
        <el-button class="mobile-filter-sheet__action" @click="clearDraft">
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
  color: var(--el-text-color-primary);
}

.mobile-filter-sheet__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 6px 12px 6px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
}

.mobile-filter-sheet__heading {
  display: flex;
  align-items: baseline;
  gap: 8px;

  strong {
    font-size: 17px;
  }

  span {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}

.mobile-filter-sheet__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;

  &:active {
    background: var(--el-fill-color-light);
  }

  > span {
    width: 20px;
    height: 20px;
  }
}

.mobile-filter-sheet__body {
  flex: 1 1 0;
  min-height: 0;
  padding: 4px 16px 20px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.mobile-filter-sheet__item {
  padding: 16px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);

  &:last-child {
    border-bottom: 0;
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

  small {
    flex-shrink: 0;
    color: var(--el-text-color-secondary);
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
    min-height: 42px;
  }
}

.mobile-filter-sheet__footer {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 10px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.mobile-filter-sheet__action {
  width: 100%;
  min-height: 44px;
  margin: 0;
}
</style>

<style lang="scss">
.dash-mobile-filter-sheet {
  display: flex;
  max-height: calc(100dvh - env(safe-area-inset-top));
  overflow: hidden;
  border-radius: 18px 18px 0 0;

  .el-drawer__body {
    display: flex;
    flex: 1;
    min-height: 0;
    padding: 0;
  }
}
</style>
