<!--
 * @Description: 看板顶栏：标题 / 描述、筛选 tag、右侧工具。筛选草稿在 useDashFilterChips。
-->
<script setup lang="ts">
import type { DashFilterValues, VisDashFilterDef } from '../dashApi'
import type { DashPresentationMode } from '../dashPresentation'
import type { DashThemeId } from '../dashTheme'
import type { DashToolAction } from './DashToolsMenu.vue'
import { useEventListener } from '@vueuse/core'
import VisActionButton from '@/views/vis/shared/VisActionButton.vue'
import {
  dashChromeVars,
  dashOverlayVars,
  DEFAULT_DASH_THEME,
} from '../dashTheme'
import { isDashPopperTarget, useDashFilterChips } from '../useDashFilterChips'
import { useDashFilterLabels } from '../useDashFilterOptions'
import DashFilterChipFields from './DashFilterChipFields.vue'
import DashMobileFilterSheet from './DashMobileFilterSheet.vue'
import DashToolsMenu from './DashToolsMenu.vue'

const props = withDefaults(defineProps<{
  defs: VisDashFilterDef[]
  title?: string
  desc?: string
  previewDisabled?: boolean
  showPreview?: boolean
  showSubscription?: boolean
  showFavorite?: boolean
  favorite?: boolean
  favoriteBusy?: boolean
  screenshotting?: boolean
  /** 设计页且有编辑权限：第二组整组出现 */
  showDesign?: boolean
  adding?: boolean
  dirty?: boolean
  saveLoading?: boolean
  saveDisabled?: boolean
  loading?: boolean
  refreshing?: boolean
  refreshFailed?: number
  filterOptionsDashboardId?: string
  presentationMode?: DashPresentationMode
}>(), {
  title: '',
  desc: '',
  previewDisabled: false,
  showPreview: true,
  showSubscription: false,
  showFavorite: false,
  favorite: false,
  favoriteBusy: false,
  screenshotting: false,
  showDesign: false,
  adding: false,
  dirty: false,
  saveLoading: false,
  saveDisabled: false,
  loading: false,
  refreshing: false,
  refreshFailed: 0,
  filterOptionsDashboardId: '',
  presentationMode: 'wide',
})
const emit = defineEmits<{
  refresh: []
  reloadCards: []
  preview: []
  screenshot: []
  subscription: []
  favorite: []
  addCard: []
  addText: []
  addGroup: []
  settings: []
  save: []
}>()
const theme = defineModel<DashThemeId>('theme', { default: DEFAULT_DASH_THEME })
const values = defineModel<DashFilterValues>('values', { required: true })
const gridGuides = defineModel<boolean>('gridGuides', { default: true })
const dockRef = ref<HTMLElement>()
const touchActionsVisible = ref(false)
const toolsOpen = ref(false)
const mobileFiltersOpen = ref(false)
const {
  openUid,
  tagsRef,
  workingOf,
  toggleChip,
  discardChip,
  confirmChip,
  resetChip,
  clearFilter,
  patch,
  isFilled,
  opLabel,
  chipLabel,
  displayText,
  popperWidth,
} = useDashFilterChips(values)
const { labelsOf } = useDashFilterLabels(
  () => props.defs,
  values,
  () => props.filterOptionsDashboardId,
)

const descText = computed(() => props.desc.trim().replace(/\s+/g, ' '))
const mobile = computed(() => props.presentationMode === 'compact' || props.presentationMode === 'medium')
const filledFilterDefs = computed(() => props.defs.filter(isFilled))
const filledFilterCount = computed(() => filledFilterDefs.value.length)
const overlayStyle = computed(() => dashOverlayVars(theme.value))
const chromeStyle = computed(() => dashChromeVars(theme.value))

function onAddCommand(command: 'card' | 'text' | 'group') {
  if (command === 'card') {
    if (!props.adding)
      emit('addCard')
    return
  }
  if (command === 'text')
    emit('addText')
  else
    emit('addGroup')
}

function closeTools() {
  toolsOpen.value = false
}

const toolActions: Record<DashToolAction, () => void> = {
  favorite: () => emit('favorite'),
  preview: () => emit('preview'),
  screenshot: () => emit('screenshot'),
  subscription: () => emit('subscription'),
  settings: () => emit('settings'),
  reloadCards: () => emit('reloadCards'),
  save: () => emit('save'),
  addCard: () => onAddCommand('card'),
  addText: () => onAddCommand('text'),
  addGroup: () => onAddCommand('group'),
}

function onToolAction(action: DashToolAction) {
  closeTools()
  toolActions[action]()
}

function onDockPointerDown(event: PointerEvent) {
  touchActionsVisible.value = event.pointerType === 'touch' || event.pointerType === 'pen'
}

function isActionPopper(target: EventTarget | null) {
  return target instanceof Element && !!target.closest('.dash-tools-popper, .personal-view-popper, .dash-add-popper')
}

function onPagePointerDown(event: PointerEvent) {
  if (event.target instanceof Node && dockRef.value?.contains(event.target))
    return
  if (!isActionPopper(event.target))
    touchActionsVisible.value = false
}

function onPageScroll(event: Event) {
  if (
    isDashPopperTarget(event.target)
    || isActionPopper(event.target)
    || (event.target instanceof Element
      && !!event.target.closest('.dash-mobile-filter-sheet'))
  ) {
    return
  }
  if (openUid.value)
    discardChip()
  toolsOpen.value = false
  touchActionsVisible.value = false
}

useEventListener(document, 'pointerdown', onPagePointerDown)
useEventListener(window, 'scroll', onPageScroll, true)

watch(mobile, (enabled) => {
  toolsOpen.value = false
  mobileFiltersOpen.value = false
  if (enabled && openUid.value)
    discardChip()
})
</script>

<template>
  <div
    ref="dockRef"
    class="filter-dock"
    :style="chromeStyle"
    :class="{
      'is-mobile': mobile,
      'is-compact': presentationMode === 'compact',
      'is-medium': presentationMode === 'medium',
      'is-touch-active': touchActionsVisible,
    }"
    @pointerdown="onDockPointerDown"
  >
    <div
      v-if="mobile && (title || descText)"
      class="filter-dock__mobile-heading"
    >
      <div class="filter-dock__mobile-copy">
        <div class="filter-dock__mobile-title" :title="title || descText">
          {{ title || '看板' }}
        </div>
        <div v-if="descText" class="filter-dock__mobile-desc" :title="descText">
          {{ descText }}
        </div>
      </div>
      <span v-if="loading" class="filter-dock__loading i-svg-spinners-ring-resize" />
    </div>

    <div
      v-if="!mobile && (title || descText)"
      class="filter-dock__heading"
    >
      <div class="filter-dock__title-row">
        <div v-if="title" class="filter-dock__title" :title="title">
          {{ title }}
        </div>
        <span v-if="loading" class="filter-dock__loading i-svg-spinners-ring-resize" />
      </div>
      <div v-if="descText" class="filter-dock__desc" :title="descText">
        {{ descText }}
      </div>
    </div>
    <div class="filter-dock__right">
      <div class="filter-dock__view">
        <slot name="personal" />
        <el-tooltip :content="refreshing ? '正在刷新' : refreshFailed ? `${refreshFailed} 张卡片刷新失败，点击重试` : '刷新数据'" placement="bottom" :show-after="200" :disabled="mobile">
          <VisActionButton
            :size="mobile ? 'compact' : 'regular'"
            :variant="mobile ? 'ghost' : 'outline'"
            :label="refreshing ? '正在刷新' : refreshFailed ? `刷新数据，${refreshFailed} 张卡片失败` : '刷新数据'"
            class="filter-dock__btn filter-dock__refresh"
            :class="{ 'has-error': refreshFailed && !refreshing }"
            :disabled="loading || refreshing || screenshotting"
            @click="emit('refresh')"
          >
            <span :class="refreshing ? 'i-svg-spinners-ring-resize' : 'i-mingcute-refresh-2-line'" />
            <i v-if="refreshFailed && !refreshing" class="filter-dock__error-dot" aria-hidden="true" />
          </VisActionButton>
        </el-tooltip>
        <el-popover
          v-model:visible="toolsOpen"
          placement="bottom-end"
          trigger="click"
          :width="320"
          :show-arrow="false"
          :persistent="false"
          popper-class="dash-tools-popper"
          :popper-style="overlayStyle"
          role="dialog"
        >
          <template #reference>
            <VisActionButton
              data-dashboard-tools-trigger
              :size="mobile ? 'compact' : 'regular'"
              :variant="mobile ? 'ghost' : 'outline'"
              class="filter-dock__btn"
              :active="toolsOpen"
              label="更多操作"
              aria-haspopup="dialog"
              :aria-expanded="toolsOpen"
              @keydown.esc.stop="closeTools"
            >
              <span class="i-mingcute-more-2-line" />
            </VisActionButton>
          </template>

          <DashToolsMenu
            v-model:theme="theme"
            v-model:grid-guides="gridGuides"
            :desc="descText"
            :mobile="mobile"
            :show-design="showDesign"
            :show-preview="showPreview"
            :preview-disabled="previewDisabled"
            :show-favorite="showFavorite"
            :favorite="favorite"
            :favorite-busy="favoriteBusy"
            :show-subscription="showSubscription"
            :loading="loading"
            :screenshotting="screenshotting"
            :adding="adding"
            :save-loading="saveLoading"
            :save-disabled="saveDisabled"
            @action="onToolAction"
            @update:theme="closeTools"
            @keydown.esc.stop="closeTools"
          />
        </el-popover>
      </div>
      <i v-if="!mobile && showDesign" class="filter-dock__tools-sep" />
      <div v-if="!mobile && showDesign" class="filter-dock__design">
        <el-tooltip :content="gridGuides ? '隐藏辅助线' : '显示辅助线'" placement="bottom" :show-after="200">
          <VisActionButton
            size="regular" variant="outline" label="辅助线"
            class="filter-dock__btn"
            :active="gridGuides"
            :aria-pressed="gridGuides"
            :disabled="loading || screenshotting"
            @click="gridGuides = !gridGuides"
          >
            <span class="i-mingcute-grid-line" />
          </VisActionButton>
        </el-tooltip>
        <el-dropdown
          trigger="hover"
          placement="bottom-end"
          popper-class="dash-add-popper"
          :show-timeout="100"
          :hide-timeout="100"
          :popper-style="overlayStyle"
          @command="onAddCommand"
        >
          <VisActionButton
            size="regular" variant="outline"
            class="filter-dock__btn filter-dock__add"
            label="添加内容"
          >
            <span :class="adding ? 'i-svg-spinners-ring-resize' : 'i-mingcute-add-square-line'" />
          </VisActionButton>
          <template #dropdown>
            <el-dropdown-menu class="dash-add-menu">
              <el-dropdown-item command="card" :disabled="adding">
                <span class="i-mingcute-layout-grid-line" />
                卡片
              </el-dropdown-item>
              <el-dropdown-item command="text">
                <span class="i-mingcute-paragraph-line" />
                标注
              </el-dropdown-item>
              <el-dropdown-item command="group">
                <span class="i-mingcute-new-folder-line" />
                分组
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-tooltip
          content="配置"
          placement="bottom"
          :show-after="200"
        >
          <VisActionButton
            size="regular" variant="outline" label="配置看板"
            class="filter-dock__btn"
            @click="emit('settings')"
          >
            <span class="i-mingcute-settings-3-line" />
          </VisActionButton>
        </el-tooltip>
        <el-tooltip
          content="重载看板"
          placement="bottom"
          :show-after="200"
        >
          <VisActionButton
            size="regular" variant="outline" label="重载看板"
            class="filter-dock__btn"
            @click="emit('reloadCards')"
          >
            <span class="i-mingcute-refresh-anticlockwise-1-line" />
          </VisActionButton>
        </el-tooltip>
        <el-button
          class="filter-dock__save"
          type="primary"
          :loading="saveLoading"
          :disabled="saveDisabled"
          @click="emit('save')"
        >
          <span v-if="dirty" class="filter-dock__save-dot" aria-hidden="true" />
          保存
        </el-button>
      </div>
    </div>
    <div v-if="defs.length" class="filter-dock__context">
      <div v-if="mobile && defs.length" class="filter-dock__mobile-filters">
        <button
          type="button"
          class="filter-dock__mobile-filter"
          :aria-label="filledFilterCount ? `筛选，已启用 ${filledFilterCount} 项` : '筛选'"
          aria-haspopup="dialog"
          :aria-expanded="mobileFiltersOpen"
          @click="mobileFiltersOpen = true"
        >
          <span class="filter-dock__mobile-filter-label" :class="{ 'is-on': filledFilterCount > 0 }">
            <span class="i-mingcute-filter-2-line" />
            筛选
            <span v-if="filledFilterCount" class="filter-dock__mobile-filter-count">{{ filledFilterCount }}</span>
          </span>
        </button>
        <div class="filter-dock__mobile-summary">
          <span
            v-for="def in filledFilterDefs"
            :key="def.uid"
            class="filter-dock__mobile-summary-item"
            :title="`${chipLabel(def)}：${displayText(def, labelsOf(def.uid))}`"
          >
            <span>{{ chipLabel(def) }}</span>
            {{ displayText(def, labelsOf(def.uid)) }}
          </span>
          <span v-if="!filledFilterCount" class="filter-dock__mobile-summary-empty">全部数据</span>
        </div>
      </div>

      <DashMobileFilterSheet
        v-if="mobile"
        v-model:open="mobileFiltersOpen"
        v-model:values="values"
        :defs="defs"
        :dashboard-id="filterOptionsDashboardId"
        :surface-style="overlayStyle"
      />

      <div
        v-if="!mobile && defs.length"
        ref="tagsRef"
        class="filter-dock__tags"
      >
        <el-popover
          v-for="def in defs"
          :key="def.uid"
          :visible="openUid === def.uid"
          placement="bottom-start"
          :width="popperWidth(def)"
          :persistent="true"
          :show-arrow="false"
          popper-class="dash-filter-chip-popper"
          :popper-style="overlayStyle"
        >
          <template #reference>
            <button
              type="button"
              class="filter-chip"
              :class="{ 'is-on': isFilled(def), 'is-open': openUid === def.uid }"
              @click.stop="toggleChip(def.uid)"
            >
              <span class="filter-chip__k">{{ chipLabel(def) }}：</span>
              <span class="filter-chip__v">
                <span class="filter-chip__value">{{ displayText(def, labelsOf(def.uid)) }}</span>
                <span
                  v-if="isFilled(def)"
                  class="filter-chip__clear"
                  title="清除"
                  @click.stop="clearFilter(def.uid)"
                >
                  <span class="i-mingcute-close-line" />
                </span>
              </span>
            </button>
          </template>
          <DashFilterChipFields
            :def="def"
            :item="workingOf(def.uid)"
            :op-label="opLabel(def)"
            :dashboard-id="filterOptionsDashboardId"
            @patch="(next) => patch(def.uid, next)"
          />
          <div class="dash-filter-chip-popper__footer">
            <el-button size="small" @click.stop="resetChip">
              清空
            </el-button>
            <el-button type="primary" size="small" @click.stop="confirmChip">
              确认
            </el-button>
          </div>
        </el-popover>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/theme/presentation.scss' as ui;

.filter-dock {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'heading actions';
  column-gap: 16px;
  row-gap: var(--vis-space-2);
  align-items: center;
  pointer-events: auto;
}

.filter-dock:has(> .filter-dock__context) {
  grid-template-areas:
    'heading actions'
    'context context';
}

.filter-dock.is-mobile {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'mobile-heading mobile-actions'
    'context context';
  column-gap: 4px;
  row-gap: 0;
}

.filter-dock__context {
  grid-area: context;
  min-width: 0;
  pointer-events: auto;
}

.filter-dock__context > .filter-dock__tags,
.filter-dock__context > .filter-dock__mobile-filters {
  min-width: 0;
}

.filter-dock__refresh {
  position: relative;

  &.has-error {
    color: var(--el-color-warning);
  }
}

.filter-dock__error-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--el-color-warning);
}

.filter-dock.is-compact .filter-dock__context {
  padding: 4px 0;
}

.filter-dock__mobile-heading {
  grid-area: mobile-heading;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: var(--vis-control-touch);
  pointer-events: auto;
}

.filter-dock__mobile-copy {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
}

.filter-dock__mobile-title {
  min-width: 0;
  overflow: hidden;
  color: var(--dash-title, var(--el-text-color-primary));
  font-size: 17px;
  font-weight: 650;
  line-height: 24px;
  letter-spacing: -0.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-dock__mobile-desc {
  min-width: 0;
  overflow: hidden;
  color: var(--dash-content-muted, var(--el-text-color-secondary));
  font-size: 12px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-dock.is-mobile .filter-dock__right {
  grid-area: mobile-actions;
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 0;
  margin-right: -8px;
}

.filter-dock.is-mobile .filter-dock__view {
  gap: 0;

  :deep(.vis-action-button) {
    min-width: var(--vis-control-compact);
    min-height: var(--vis-control-compact);
  }
}

.filter-dock__mobile-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  pointer-events: auto;
}

.filter-dock__mobile-filter {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  height: var(--vis-control-touch);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dash-content-color, var(--na-text-regular));
  font-size: var(--vis-caption-size);
  cursor: pointer;
  @include ui.focus-ring;
}

.filter-dock__mobile-filter-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  @include ui.filter-chip;

  &.is-on {
    color: var(--dash-accent, var(--na-color-primary));
  }

  > .i-mingcute-filter-2-line {
    width: 14px;
    height: 14px;
  }
}

.filter-dock__mobile-filter-count {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.filter-dock__mobile-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.filter-dock__mobile-summary-item {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 5px;
  color: var(--dash-content-color, var(--na-text-regular));
  font-size: var(--vis-caption-size);
  line-height: 28px;
  white-space: nowrap;

  > span {
    color: var(--dash-content-muted, var(--na-text-muted));
  }
}

.filter-dock__mobile-summary-empty {
  color: var(--dash-content-muted, var(--na-text-muted));
  font-size: var(--vis-caption-size);
}

.filter-dock__heading {
  grid-area: heading;
  display: flex;
  align-items: baseline;
  gap: var(--vis-space-3);
  min-width: 0;
  min-height: var(--vis-control-size);
  pointer-events: auto;

  &:has(.filter-dock__desc) .filter-dock__title-row {
    max-width: 60%;
  }
}

.filter-dock__title-row {
  display: flex;
  flex: 0 1 auto;
  align-items: center;
  gap: var(--vis-space-2);
  max-width: 100%;
  min-width: 0;
}

.filter-dock__title {
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 16em;
  font-size: var(--vis-page-title-size);
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: var(--vis-page-title-leading);
  color: var(--dash-title, var(--el-text-color-primary));
}

.filter-dock__loading {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--dash-accent, var(--el-color-primary));
}

.filter-dock__desc {
  flex: 1 1 180px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  font-size: var(--vis-body-size);
  line-height: 20px;
  color: var(--dash-content-muted, var(--el-text-color-secondary));
}

@container (max-width: 560px) {
  .filter-dock__desc {
    display: none;
  }

  .filter-dock__heading:has(.filter-dock__desc) .filter-dock__title-row {
    max-width: 100%;
  }
  .filter-dock__title {
    font-size: 17px;
    line-height: 24px;
  }
  .filter-dock .filter-dock__right,
  .filter-dock .filter-dock__view {
    gap: 4px;
  }
  .filter-dock__view :deep(.vis-action-button) {
    width: 28px;
    height: 28px;
  }
}

.filter-dock__right {
  grid-area: actions;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-self: end;
  gap: 8px;
  overflow: visible;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

// 独立预览的手机 / 平板布局与卡片操作一致，直接显示工具，无需先点顶栏。
.filter-dock.is-mobile .filter-dock__right,
.filter-dock.is-touch-active .filter-dock__right,
.filter-dock:has(:focus-visible) .filter-dock__right,
.filter-dock:has(.filter-dock__right [aria-expanded='true']) .filter-dock__right {
  opacity: 1;
  pointer-events: auto;
}

@media (hover: hover) and (pointer: fine) {
  .filter-dock:hover .filter-dock__right {
    opacity: 1;
    pointer-events: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .filter-dock__right {
    transition: none;
  }
}

.filter-dock__view,
.filter-dock__design {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-dock__tools-sep {
  flex-shrink: 0;
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: color-mix(in srgb, var(--dash-title, var(--na-text-strong)) 14%, transparent);
}

.filter-dock__save {
  height: var(--vis-control-size);
  margin-left: 2px;
  border-radius: var(--vis-radius-control);
  font-size: var(--vis-body-size);
}

.filter-dock__save-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 7px;
  border-radius: 50%;
  background: var(--el-color-warning);
  box-shadow: 0 0 0 2px rgb(255 255 255 / 88%);
}

.filter-dock__add {
  gap: 2px;
}

:global(.dash-add-menu .el-dropdown-menu__item) {
  gap: 9px;
  min-width: 112px;
}

:global(.dash-add-menu .el-dropdown-menu__item > span:first-child) {
  width: 16px;
  height: 16px;
}

.filter-dock__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: var(--vis-control-compact);
  pointer-events: auto;
}

.filter-chip {
  display: inline-flex;
  align-items: stretch;
  box-sizing: border-box;
  max-width: 100%;
  padding: 0;
  cursor: pointer;
  @include ui.filter-chip;
}

.filter-chip__k,
.filter-chip__value {
  line-height: 1;
}

.filter-chip__k {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  padding: 0 2px 0 12px;
  color: var(--dash-content-muted, var(--el-text-color-secondary));
  font-size: var(--vis-caption-size);
}

.filter-chip__v {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding: 0 10px 0 0;
}

.filter-chip.is-on .filter-chip__v {
  padding-right: 6px;
}

.filter-chip__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 16em;
  color: var(--dash-content-color, var(--el-text-color-regular));
  font-size: var(--vis-body-size);
}

.filter-chip:not(.is-on) .filter-chip__value {
  color: var(--dash-content-muted, var(--el-text-color-placeholder));
}

.filter-chip.is-on .filter-chip__value {
  color: var(--dash-accent, var(--el-color-primary));
  font-weight: 500;
}

.filter-chip__clear {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  color: var(--dash-content-muted, var(--el-text-color-secondary));

  .i-mingcute-close-line {
    width: 11px;
    height: 11px;
  }

  &:hover {
    background: color-mix(in srgb, var(--dash-accent, var(--na-color-primary)) 14%, transparent);
    color: var(--dash-accent, var(--el-color-primary));
  }
}
</style>
