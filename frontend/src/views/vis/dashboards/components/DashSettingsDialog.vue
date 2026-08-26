<!--
 * @Description: 看板通用配置。各 Tab 只改草稿，确定后写回。
-->
<script setup lang="ts">
import type { DashSettingsDraft, VisDashFilterDef } from '../dashApi'
import type { DashCardRadiusId, DashThemeId } from '../dashTheme'
import type { VisCard } from '@/views/vis/shared/types'
import { cloneFilterDefs } from '../dashApi'
import { DEFAULT_DASH_CARD_RADIUS, DEFAULT_DASH_THEME, resolveDashCardRadiusId, resolveDashThemeId } from '../dashTheme'
import DashFilterSettings from './DashFilterSettings.vue'
import DashStyleSettings from './DashStyleSettings.vue'

type SettingsTab = 'filters' | 'style'

const props = defineProps<{
  filters: VisDashFilterDef[]
  theme?: DashThemeId
  cardRadius?: DashCardRadiusId
  autoRefreshSec?: number
  cards: VisCard[]
}>()

const emit = defineEmits<{
  confirm: [draft: DashSettingsDraft]
}>()

const visible = defineModel<boolean>('visible', { required: true })

const SETTINGS_TABS: Array<{ id: SettingsTab, label: string }> = [
  { id: 'filters', label: '筛选配置' },
  { id: 'style', label: '通用配置' },
]
const activeTab = ref<SettingsTab>('filters')
const draftFilters = ref<VisDashFilterDef[]>([])
const draftTheme = ref<DashThemeId>(DEFAULT_DASH_THEME)
const draftCardRadius = ref<DashCardRadiusId>(DEFAULT_DASH_CARD_RADIUS)
const draftAutoRefreshSec = ref<number>()

function snapshot() {
  activeTab.value = 'filters'
  draftFilters.value = cloneFilterDefs(props.filters)
  draftTheme.value = resolveDashThemeId(props.theme)
  draftCardRadius.value = resolveDashCardRadiusId(props.cardRadius)
  draftAutoRefreshSec.value = props.autoRefreshSec
}

function handleCancel() {
  visible.value = false
}

function handleConfirm() {
  emit('confirm', {
    filters: cloneFilterDefs(draftFilters.value),
    theme: resolveDashThemeId(draftTheme.value),
    cardRadius: resolveDashCardRadiusId(draftCardRadius.value),
    autoRefreshSec: draftAutoRefreshSec.value,
  })
  visible.value = false
}

watch(visible, (open) => {
  if (open)
    snapshot()
})
</script>

<template>
  <CustomDialog
    v-model:visible="visible"
    class="dash-settings-dialog"
    title="看板配置"
    size="small"
    append-to-body
    destroy-on-close
    confirm-text="确定"
    :handler-cancel="handleCancel"
    :handler-confirm="handleConfirm"
  >
    <template #custom-dialog-body>
      <div class="dash-settings">
        <div
          class="dash-settings__nav"
          role="tablist"
        >
          <button
            v-for="tab in SETTINGS_TABS"
            :key="tab.id"
            type="button"
            role="tab"
            class="dash-settings__tab"
            :class="{ 'is-active': activeTab === tab.id }"
            :aria-selected="activeTab === tab.id"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="dash-settings__body">
          <DashFilterSettings
            v-show="activeTab === 'filters'"
            v-model:items="draftFilters"
            :cards="cards"
          />
          <DashStyleSettings
            v-show="activeTab === 'style'"
            v-model:theme="draftTheme"
            v-model:card-radius="draftCardRadius"
            v-model:auto-refresh-sec="draftAutoRefreshSec"
          />
        </div>
      </div>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.dash-settings {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.dash-settings__nav {
  flex-shrink: 0;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-lighter);
}

.dash-settings__tab {
  height: 40px;
  padding: 0 8px;
  border: none;
  border-right: 1px solid var(--el-border-color-light);
  background: transparent;
  color: var(--el-text-color-regular);
  font-size: 13px;
  line-height: 40px;
  text-align: center;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:last-child {
    border-right: none;
  }

  &:hover:not(.is-active) {
    color: var(--el-text-color-primary);
  }

  &.is-active {
    background: var(--el-bg-color);
    color: var(--el-color-primary);
    font-weight: 600;
  }
}

.dash-settings__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
}
</style>

<style lang="scss">
.dash-settings-dialog.custom-dialog {
  --dialog-body-max-height: min(68vh, 600px);
  --dialog-body-padding: 0;

  .el-dialog__body {
    display: flex;
    flex-direction: column;
    height: var(--dialog-body-max-height);
    overflow: hidden;
  }
}
</style>
