<!--
 * @Description: 看板顶栏：标题 / 描述、筛选 tag、右侧工具。筛选草稿在 useDashFilterChips。
-->
<script setup lang="ts">
import type { DashFilterValues, VisDashFilterDef } from '../dashApi'
import type { DashPresentationMode } from '../dashPresentation'
import type { DashThemeId } from '../dashTheme'
import { useEventListener } from '@vueuse/core'
import VisActionButton from '@/views/vis/shared/VisActionButton.vue'
import {
  DASH_THEME_PRESETS,
  dashChromeVars,
  dashOverlayVars,
  dashThemeSwatchStyle,
  DEFAULT_DASH_THEME,
} from '../dashTheme'
import { isDashPopperTarget, useDashFilterChips } from '../useDashFilterChips'
import { useDashFilterLabels } from '../useDashFilterOptions'
import DashFilterChipFields from './DashFilterChipFields.vue'
import DashMobileFilterSheet from './DashMobileFilterSheet.vue'

const props = withDefaults(defineProps<{
  defs: VisDashFilterDef[]
  title?: string
  desc?: string
  previewDisabled?: boolean
  showPreview?: boolean
  screenshotting?: boolean
  /** 设计页且有编辑权限：第二组整组出现 */
  showDesign?: boolean
  adding?: boolean
  dirty?: boolean
  saveLoading?: boolean
  saveDisabled?: boolean
  loading?: boolean
  filterOptionsDashboardId?: string
  presentationMode?: DashPresentationMode
}>(), {
  title: '',
  desc: '',
  previewDisabled: false,
  showPreview: true,
  screenshotting: false,
  showDesign: false,
  adding: false,
  dirty: false,
  saveLoading: false,
  saveDisabled: false,
  loading: false,
  filterOptionsDashboardId: '',
  presentationMode: 'wide',
})
const emit = defineEmits<{
  refresh: []
  reloadCards: []
  preview: []
  screenshot: []
  addCard: []
  addText: []
  addGroup: []
  settings: []
  save: []
}>()
const theme = defineModel<DashThemeId>('theme', { default: DEFAULT_DASH_THEME })
const values = defineModel<DashFilterValues>('values', { required: true })
const gridGuides = defineModel<boolean>('gridGuides', { default: true })
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

function pickTheme(id: DashThemeId) {
  theme.value = id
  toolsOpen.value = false
}

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

function emitToolAction(action: 'preview' | 'screenshot' | 'settings' | 'reloadCards' | 'save') {
  closeTools()
  switch (action) {
    case 'preview':
      emit('preview')
      break
    case 'screenshot':
      emit('screenshot')
      break
    case 'settings':
      emit('settings')
      break
    case 'reloadCards':
      emit('reloadCards')
      break
    case 'save':
      emit('save')
      break
  }
}

function onMenuAdd(command: 'card' | 'text' | 'group') {
  closeTools()
  onAddCommand(command)
}

function onPageScroll(event: Event) {
  if (
    isDashPopperTarget(event.target)
    || (event.target instanceof Element
      && !!event.target.closest('.dash-tools-popper, .dash-mobile-filter-sheet'))
  ) {
    return
  }
  if (openUid.value)
    discardChip()
  toolsOpen.value = false
}

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
    class="filter-dock"
    :style="chromeStyle"
    :class="{
      'is-mobile': mobile,
      'is-compact': presentationMode === 'compact',
      'is-medium': presentationMode === 'medium',
    }"
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
      <span v-if="dirty" class="filter-dock__dirty">未保存</span>
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
        <span v-if="dirty" class="filter-dock__dirty">未保存</span>
      </div>
      <div v-if="descText" class="filter-dock__desc" :title="descText">
        {{ descText }}
      </div>
    </div>
    <div class="filter-dock__right">
      <div class="filter-dock__view">
        <el-tooltip
          v-if="!mobile && showDesign && showPreview"
          :content="previewDisabled ? '请先保存看板' : '预览'"
          placement="bottom"
          :show-after="200"
        >
          <span class="filter-dock__preview">
            <VisActionButton
              size="regular" variant="outline" label="预览看板"
              class="filter-dock__btn"
              :disabled="previewDisabled"
              @click="emit('preview')"
            >
              <span class="i-mingcute-eye-2-line" />
            </VisActionButton>
          </span>
        </el-tooltip>
        <el-tooltip content="刷新数据" placement="bottom" :show-after="200" :disabled="mobile">
          <VisActionButton
            :size="mobile ? 'touch' : 'regular'"
            :variant="mobile ? 'ghost' : 'outline'"
            label="刷新数据"
            class="filter-dock__btn"
            :disabled="loading || screenshotting"
            @click="emit('refresh')"
          >
            <span class="i-mingcute-refresh-2-line" />
          </VisActionButton>
        </el-tooltip>
        <el-popover
          v-model:visible="toolsOpen"
          placement="bottom-end"
          trigger="click"
          :width="268"
          :show-arrow="false"
          :persistent="false"
          :popper-class="mobile ? 'dash-tools-popper is-touch' : 'dash-tools-popper'"
          :popper-style="overlayStyle"
          role="dialog"
        >
          <template #reference>
            <VisActionButton
              :size="mobile ? 'touch' : 'regular'"
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

          <div class="dash-tools" @keydown.esc.stop="closeTools">
            <div v-if="descText" class="dash-tools__desc">
              <span>看板说明</span>
              <p>{{ descText }}</p>
            </div>

            <button
              v-if="!mobile && !showDesign && showPreview"
              type="button"
              class="dash-tools__action"
              :disabled="previewDisabled"
              @click="emitToolAction('preview')"
            >
              <span class="i-mingcute-eye-2-line" />
              <span>独立预览</span>
            </button>

            <button
              type="button"
              class="dash-tools__action"
              :disabled="loading || screenshotting"
              @click="emitToolAction('screenshot')"
            >
              <span :class="screenshotting ? 'i-svg-spinners-ring-resize' : 'i-mingcute-camera-2-line'" />
              <span>{{ screenshotting ? '正在截屏…' : '一键截屏' }}</span>
            </button>

            <div class="dash-tools__themes">
              <span class="dash-tools__label">临时换肤</span>
              <div class="dash-tools__theme-grid">
                <button
                  v-for="item in DASH_THEME_PRESETS"
                  :key="item.id"
                  type="button"
                  class="dash-tools__theme"
                  :class="{ 'is-active': theme === item.id }"
                  :aria-label="`切换为${item.name}主题`"
                  :aria-pressed="theme === item.id"
                  :title="item.name"
                  @click="pickTheme(item.id)"
                >
                  <span
                    class="dash-tools__swatch"
                    :style="{ background: item.tokens.canvas }"
                  >
                    <i :style="dashThemeSwatchStyle(item)" />
                  </span>
                  <span class="dash-tools__theme-name">{{ item.name }}</span>
                </button>
              </div>
            </div>

            <template v-if="mobile && showDesign">
              <i class="dash-tools__sep" />
              <span class="dash-tools__label">设计</span>
              <button
                type="button"
                class="dash-tools__action"
                :class="{ 'is-primary': gridGuides }"
                :aria-pressed="gridGuides"
                :disabled="loading || screenshotting"
                @click="gridGuides = !gridGuides"
              >
                <span class="i-mingcute-grid-line" />
                <span>辅助线</span>
              </button>
              <div class="dash-tools__design-grid">
                <button
                  type="button"
                  class="dash-tools__action"
                  :disabled="adding"
                  @click="onMenuAdd('card')"
                >
                  <span :class="adding ? 'i-svg-spinners-ring-resize' : 'i-mingcute-layout-grid-line'" />
                  <span>添加卡片</span>
                </button>
                <button type="button" class="dash-tools__action" @click="onMenuAdd('text')">
                  <span class="i-mingcute-paragraph-line" />
                  <span>添加标注</span>
                </button>
                <button type="button" class="dash-tools__action" @click="onMenuAdd('group')">
                  <span class="i-mingcute-new-folder-line" />
                  <span>添加分组</span>
                </button>
                <button type="button" class="dash-tools__action" @click="emitToolAction('settings')">
                  <span class="i-mingcute-settings-3-line" />
                  <span>配置</span>
                </button>
                <button type="button" class="dash-tools__action" @click="emitToolAction('reloadCards')">
                  <span class="i-mingcute-refresh-anticlockwise-1-line" />
                  <span>重载看板</span>
                </button>
                <button
                  type="button"
                  class="dash-tools__action is-primary"
                  :disabled="saveDisabled || saveLoading"
                  @click="emitToolAction('save')"
                >
                  <span :class="saveLoading ? 'i-svg-spinners-ring-resize' : 'i-mingcute-save-2-line'" />
                  <span>保存</span>
                </button>
              </div>
            </template>
          </div>
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
          保存
        </el-button>
      </div>
    </div>
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
</template>

<style scoped lang="scss">
@use '@/theme/presentation.scss' as ui;

.filter-dock {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: 'heading actions';
  column-gap: 16px;
  row-gap: var(--vis-space-2);
  align-items: center;
  pointer-events: none;
}

.filter-dock:has(> .filter-dock__tags) {
  grid-template-areas:
    'heading actions'
    'tags tags';
}

.filter-dock.is-mobile {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'mobile-heading mobile-actions'
    'mobile-filter mobile-filter';
  column-gap: 4px;
  row-gap: 0;
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

.filter-dock.is-mobile .filter-dock__dirty {
  padding: 3px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--el-color-warning) 12%, transparent);
  font-size: 11px;
  line-height: 1;
}

.filter-dock.is-mobile .filter-dock__right {
  grid-area: mobile-actions;
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 0;
  margin-right: -8px;
  pointer-events: auto;
}

.filter-dock.is-mobile .filter-dock__view {
  gap: 0;
}

.filter-dock__mobile-filters {
  grid-area: mobile-filter;
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

.filter-dock__dirty {
  flex-shrink: 0;
  color: var(--el-color-warning);
  font-size: var(--vis-caption-size);
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

.filter-dock__right {
  grid-area: actions;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-self: end;
  gap: 8px;
  overflow: visible;
  pointer-events: auto;
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

.filter-dock__preview {
  display: inline-flex;
}

.filter-dock__save {
  height: var(--vis-control-size);
  margin-left: 2px;
  border-radius: var(--vis-radius-control);
  font-size: var(--vis-body-size);
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
  grid-area: tags;
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

<style lang="scss">
.dash-tools-popper {
  --dash-tools-action-height: 36px;
  --dash-tools-action-font: 13px;
  --dash-tools-swatch-height: 40px;
  box-sizing: border-box;
  max-width: calc(100vw - 24px);
  max-height: min(72dvh, 620px);
  padding: 8px !important;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid var(--dash-mobile-border, var(--el-border-color-light)) !important;
  border-radius: 14px !important;
  background: var(--dash-mobile-surface, var(--el-bg-color-overlay)) !important;
  box-shadow: var(--dash-mobile-popper-shadow, 0 8px 24px rgb(15 23 42 / 10%)) !important;
  color: var(--dash-mobile-content, var(--el-text-color-regular));
  overscroll-behavior: contain;
}

.dash-tools-popper.is-touch {
  --dash-tools-action-height: 44px;
  --dash-tools-action-font: 14px;
  --dash-tools-swatch-height: 48px;
}

.dash-tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.dash-tools__desc {
  padding: 6px 8px 9px;
  border-bottom: 1px solid color-mix(in srgb, var(--dash-mobile-border, var(--el-border-color)) 56%, transparent);

  > span,
  p {
    display: block;
    margin: 0;
  }

  > span {
    margin-bottom: 4px;
    color: var(--dash-mobile-muted, var(--el-text-color-secondary));
    font-size: 12px;
  }

  p {
    color: var(--dash-mobile-content, var(--el-text-color-regular));
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
}

.dash-tools__action {
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: var(--dash-tools-action-height);
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--dash-mobile-content, var(--el-text-color-regular));
  font-size: var(--dash-tools-action-font);
  text-align: left;
  cursor: pointer;

  &:active {
    background: var(--dash-mobile-soft, var(--el-fill-color-light));
  }

  &:focus-visible {
    border-color: color-mix(in srgb, var(--dash-mobile-accent, var(--el-color-primary)) 48%, transparent);
    outline: 2px solid color-mix(in srgb, var(--dash-mobile-accent, var(--el-color-primary)) 54%, transparent);
    outline-offset: -2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }

  &.is-primary {
    background: color-mix(in srgb, var(--dash-mobile-accent, var(--el-color-primary)) 8%, transparent);
    color: var(--dash-mobile-accent, var(--el-color-primary));
  }

  > span:first-child {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
  }
}

.dash-tools__themes {
  padding: 6px 8px 8px;
}

.dash-tools__label {
  display: block;
  padding: 0 2px 7px;
  color: var(--dash-mobile-muted, var(--el-text-color-secondary));
  font-size: var(--vis-caption-size);
}

.dash-tools__theme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.dash-tools__theme {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  min-width: 0;
  padding: 3px 3px 5px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--dash-mobile-content, var(--el-text-color-regular));
  cursor: pointer;
  outline: none;

  &:active,
  &.is-active {
    border-color: var(--dash-mobile-accent, var(--el-color-primary));
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--dash-mobile-accent, var(--el-color-primary)) 58%, transparent);
    outline-offset: 2px;
  }
}

.dash-tools__swatch {
  display: flex;
  width: 100%;
  height: var(--dash-tools-swatch-height);
  padding: 5px;
  box-sizing: border-box;
  border-radius: 6px;

  > i {
    flex: 1;
    min-width: 0;
  }
}

.dash-tools__theme-name {
  font-size: var(--vis-caption-size);
  line-height: 1.3;
}

.dash-tools__sep {
  display: block;
  height: 1px;
  margin: 2px 8px;
  background: color-mix(in srgb, var(--dash-mobile-border, var(--el-border-color)) 52%, transparent);
}

.dash-tools__design-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}

@media (hover: hover) and (pointer: fine) {
  .dash-tools__action:hover:not(:disabled) {
    background: var(--dash-mobile-soft, var(--el-fill-color-light));
  }

  .dash-tools__theme:hover {
    border-color: color-mix(in srgb, var(--dash-mobile-accent, var(--el-color-primary)) 54%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dash-tools-popper {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

.dash-filter-chip-popper {
  padding: 0 !important;

  .el-form-item {
    margin-bottom: 0;
  }

  .el-form-item__label {
    margin-bottom: 0;
    padding-bottom: 4px;
    height: auto;
    line-height: 1.2;
    font-size: 12px;
  }

  .el-form-item,
  .el-form-item__content,
  .el-input,
  .el-select,
  .el-select__wrapper,
  .el-input-number,
  .el-input-tag,
  .el-date-editor {
    width: 100%;
  }

  .el-date-editor.el-input,
  .el-date-editor.el-input__wrapper {
    width: 100%;
  }
}

.dash-filter-chip-popper__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 12px 0;
}

.dash-filter-chip-popper__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px;
}
</style>
