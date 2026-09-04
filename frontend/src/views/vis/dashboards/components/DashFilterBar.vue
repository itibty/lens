<!--
 * @Description: 看板顶栏：标题 / 描述、筛选 tag、右侧工具。筛选草稿在 useDashFilterChips。
-->
<script setup lang="ts">
import type { DashFilterValues, VisDashFilterDef } from '../dashApi'
import type { DashPresentationMode } from '../dashPresentation'
import type { DashThemeId } from '../dashTheme'
import { useEventListener } from '@vueuse/core'
import {
  DASH_THEME_PRESETS,
  dashThemeSwatchRadius,
  DEFAULT_DASH_THEME,
  resolveDashTheme,
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
const themeOpen = ref(false)
const mobileToolsOpen = ref(false)
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
  themeOpen.value = false
  mobileToolsOpen.value = false
}

const descText = computed(() => props.desc.trim().replace(/\s+/g, ' '))
const mobile = computed(() => props.presentationMode === 'compact' || props.presentationMode === 'medium')
const filledFilterCount = computed(() => props.defs.filter(isFilled).length)
const mobileSurfaceStyle = computed<Record<string, string>>(() => {
  const { tokens } = resolveDashTheme(theme.value)
  const content = tokens.content ?? tokens.title
  const muted = tokens.muted ?? `color-mix(in srgb, ${tokens.title} 64%, transparent)`
  const softFill = `color-mix(in srgb, ${tokens.title} 5%, ${tokens.card})`
  const lighterFill = `color-mix(in srgb, ${tokens.title} 3%, ${tokens.card})`
  const disabledText = `color-mix(in srgb, ${content} 42%, transparent)`
  const accentOnSurface = (weight: number) => `color-mix(in srgb, ${tokens.accent} ${weight}%, ${tokens.card})`

  return {
    '--dash-mobile-surface': tokens.card,
    '--dash-mobile-elevated': tokens.btnBg,
    '--dash-mobile-title': tokens.title,
    '--dash-mobile-content': content,
    '--dash-mobile-muted': muted,
    '--dash-mobile-border': tokens.border,
    '--dash-mobile-accent': tokens.accent,
    '--dash-mobile-soft': softFill,
    '--dash-mobile-lighter': lighterFill,
    '--dash-mobile-popper-shadow': tokens.mode === 'dark'
      ? '0 8px 24px rgb(0 0 0 / 28%)'
      : '0 8px 24px rgb(15 23 42 / 10%)',
    '--dash-mobile-sheet-shadow': tokens.mode === 'dark'
      ? '0 -8px 24px rgb(0 0 0 / 28%)'
      : '0 -8px 24px rgb(15 23 42 / 10%)',
    '--el-bg-color': tokens.card,
    '--el-bg-color-overlay': tokens.card,
    '--el-fill-color-blank': tokens.btnBg,
    '--el-fill-color-light': softFill,
    '--el-fill-color-lighter': lighterFill,
    '--el-border-color': tokens.border,
    '--el-border-color-light': `color-mix(in srgb, ${tokens.border} 76%, transparent)`,
    '--el-border-color-lighter': `color-mix(in srgb, ${tokens.border} 58%, transparent)`,
    '--el-border-color-extra-light': `color-mix(in srgb, ${tokens.border} 42%, transparent)`,
    '--el-text-color-primary': tokens.title,
    '--el-text-color-regular': content,
    '--el-text-color-secondary': muted,
    '--el-text-color-placeholder': disabledText,
    '--el-disabled-bg-color': softFill,
    '--el-disabled-border-color': `color-mix(in srgb, ${tokens.border} 52%, transparent)`,
    '--el-disabled-text-color': disabledText,
    '--el-color-primary': tokens.accent,
    '--el-color-primary-light-3': accentOnSurface(70),
    '--el-color-primary-light-5': accentOnSurface(50),
    '--el-color-primary-light-7': accentOnSurface(30),
    '--el-color-primary-light-8': accentOnSurface(20),
    '--el-color-primary-light-9': accentOnSurface(10),
    '--el-color-primary-dark-2': `color-mix(in srgb, ${tokens.accent} 80%, #000)`,
    'background': tokens.card,
    'borderColor': tokens.border,
    'color': content,
  }
})

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

function closeMobileTools() {
  mobileToolsOpen.value = false
}

function emitMobile(action: 'screenshot' | 'settings' | 'reloadCards' | 'save') {
  closeMobileTools()
  switch (action) {
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

function onMobileAdd(command: 'card' | 'text' | 'group') {
  closeMobileTools()
  onAddCommand(command)
}

function onPageScroll(event: Event) {
  if (
    isDashPopperTarget(event.target)
    || (event.target instanceof Element
      && !!event.target.closest('.dash-mobile-tools-popper, .dash-mobile-filter-sheet'))
  ) {
    return
  }
  if (openUid.value)
    discardChip()
  themeOpen.value = false
  mobileToolsOpen.value = false
}

useEventListener(window, 'scroll', onPageScroll, true)

watch(mobile, (enabled) => {
  if (enabled) {
    if (openUid.value)
      discardChip()
    themeOpen.value = false
    return
  }
  mobileToolsOpen.value = false
  mobileFiltersOpen.value = false
})
</script>

<template>
  <div
    class="filter-dock"
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

    <div v-if="mobile" class="filter-dock__mobile-actions">
      <button
        type="button"
        class="filter-dock__mobile-btn"
        aria-label="刷新数据"
        :disabled="screenshotting"
        @click="emit('refresh')"
      >
        <span class="i-mingcute-refresh-2-line" />
      </button>
      <el-popover
        v-model:visible="mobileToolsOpen"
        placement="bottom-end"
        trigger="click"
        :width="268"
        :show-arrow="false"
        :persistent="false"
        popper-class="dash-mobile-tools-popper"
        :popper-style="mobileSurfaceStyle"
        role="dialog"
      >
        <template #reference>
          <button
            type="button"
            class="filter-dock__mobile-btn"
            :class="{ 'is-active': mobileToolsOpen }"
            aria-label="更多操作"
            aria-haspopup="dialog"
            :aria-expanded="mobileToolsOpen"
          >
            <span class="i-mingcute-more-2-line" />
          </button>
        </template>

        <div class="dash-mobile-tools">
          <div v-if="descText" class="dash-mobile-tools__desc">
            <span>看板说明</span>
            <p>{{ descText }}</p>
          </div>

          <button
            type="button"
            class="dash-mobile-tools__action"
            :disabled="screenshotting"
            @click="emitMobile('screenshot')"
          >
            <span :class="screenshotting ? 'i-svg-spinners-ring-resize' : 'i-mingcute-camera-2-line'" />
            <span>{{ screenshotting ? '正在截屏…' : '一键截屏' }}</span>
          </button>

          <div class="dash-mobile-tools__themes">
            <span class="dash-mobile-tools__label">临时换肤</span>
            <div class="dash-mobile-tools__theme-grid">
              <button
                v-for="item in DASH_THEME_PRESETS"
                :key="item.id"
                type="button"
                class="dash-mobile-tools__theme"
                :class="{ 'is-active': theme === item.id }"
                :aria-label="`切换为${item.name}主题`"
                :aria-pressed="theme === item.id"
                :title="item.name"
                :style="{ background: item.tokens.canvas }"
                @click="pickTheme(item.id)"
              >
                <span
                  :style="{
                    background: item.tokens.card,
                    borderRadius: `${dashThemeSwatchRadius(item.tokens.radius)}px`,
                  }"
                />
              </button>
            </div>
          </div>

          <template v-if="showDesign">
            <i class="dash-mobile-tools__sep" />
            <span class="dash-mobile-tools__label">设计</span>
            <div class="dash-mobile-tools__design-grid">
              <button
                type="button"
                class="dash-mobile-tools__action"
                :disabled="adding"
                @click="onMobileAdd('card')"
              >
                <span :class="adding ? 'i-svg-spinners-ring-resize' : 'i-mingcute-layout-grid-line'" />
                <span>添加卡片</span>
              </button>
              <button type="button" class="dash-mobile-tools__action" @click="onMobileAdd('text')">
                <span class="i-mingcute-paragraph-line" />
                <span>添加标注</span>
              </button>
              <button type="button" class="dash-mobile-tools__action" @click="onMobileAdd('group')">
                <span class="i-mingcute-new-folder-line" />
                <span>添加分组</span>
              </button>
              <button type="button" class="dash-mobile-tools__action" @click="emitMobile('settings')">
                <span class="i-mingcute-settings-3-line" />
                <span>配置</span>
              </button>
              <button type="button" class="dash-mobile-tools__action" @click="emitMobile('reloadCards')">
                <span class="i-mingcute-refresh-anticlockwise-1-line" />
                <span>重载看板</span>
              </button>
              <button
                type="button"
                class="dash-mobile-tools__action is-primary"
                :disabled="saveDisabled || saveLoading"
                @click="emitMobile('save')"
              >
                <span :class="saveLoading ? 'i-svg-spinners-ring-resize' : 'i-mingcute-save-2-line'" />
                <span>保存</span>
              </button>
            </div>
          </template>
        </div>
      </el-popover>
    </div>

    <button
      v-if="mobile && defs.length"
      type="button"
      class="filter-dock__mobile-filter"
      :class="{ 'is-on': filledFilterCount > 0 }"
      :aria-label="filledFilterCount ? `筛选，已启用 ${filledFilterCount} 项` : '筛选'"
      aria-haspopup="dialog"
      :aria-expanded="mobileFiltersOpen"
      @click="mobileFiltersOpen = true"
    >
      <span class="filter-dock__mobile-filter-icon i-mingcute-filter-2-line" />
      <span class="filter-dock__mobile-filter-copy">
        <span>筛选条件</span>
        <small>{{ filledFilterCount ? '已设置数据范围' : '全部数据' }}</small>
      </span>
      <span v-if="filledFilterCount" class="filter-dock__mobile-filter-count">
        {{ filledFilterCount }}
      </span>
      <span class="filter-dock__mobile-filter-arrow i-mingcute-right-line" />
    </button>

    <DashMobileFilterSheet
      v-if="mobile"
      v-model:open="mobileFiltersOpen"
      v-model:values="values"
      :defs="defs"
      :dashboard-id="filterOptionsDashboardId"
      :surface-style="mobileSurfaceStyle"
    />

    <div
      v-if="!mobile && (title || descText)"
      class="filter-dock__heading"
    >
      <div
        v-if="title"
        class="filter-dock__title"
      >
        {{ title }}
      </div>
      <span v-if="loading" class="filter-dock__loading i-svg-spinners-ring-resize" />
      <span v-if="dirty" class="filter-dock__dirty">未保存</span>
      <i
        v-if="title && descText"
        class="filter-dock__sep"
      />
      <div
        v-if="descText"
        class="filter-dock__desc"
        :title="descText"
      >
        {{ descText }}
      </div>
    </div>
    <div v-if="!mobile" class="filter-dock__right">
      <div class="filter-dock__view">
        <el-tooltip
          :content="previewDisabled ? '请先保存看板' : '预览'"
          placement="bottom"
          :show-after="200"
        >
          <span class="filter-dock__preview">
            <button
              type="button"
              class="filter-dock__btn"
              :disabled="previewDisabled"
              @click="emit('preview')"
            >
              <span class="i-mingcute-eye-2-line" />
            </button>
          </span>
        </el-tooltip>
        <el-tooltip
          content="刷新数据"
          placement="bottom"
          :show-after="200"
        >
          <button
            type="button"
            class="filter-dock__btn"
            :disabled="screenshotting"
            @click="emit('refresh')"
          >
            <span class="i-mingcute-refresh-2-line" />
          </button>
        </el-tooltip>
        <el-tooltip
          :content="screenshotting ? '正在截屏…' : '一键截屏'"
          placement="bottom"
          :show-after="200"
        >
          <button
            type="button"
            class="filter-dock__btn"
            :disabled="screenshotting"
            :class="{ 'is-active': screenshotting }"
            @click="emit('screenshot')"
          >
            <span :class="screenshotting ? 'i-svg-spinners-ring-resize' : 'i-mingcute-camera-2-line'" />
          </button>
        </el-tooltip>
        <el-popover
          v-model:visible="themeOpen"
          placement="bottom-end"
          trigger="click"
          :width="168"
          :show-arrow="false"
          popper-class="dash-theme-popper"
        >
          <template #reference>
            <button
              type="button"
              class="filter-dock__btn"
              :class="{ 'is-active': themeOpen }"
              title="临时换肤"
            >
              <span class="i-mingcute-palette-line" />
            </button>
          </template>
          <div class="dash-theme-popper__grid">
            <button
              v-for="item in DASH_THEME_PRESETS"
              :key="item.id"
              type="button"
              class="dash-theme-popper__item"
              :class="{ 'is-active': theme === item.id }"
              :title="item.name"
              :style="{ background: item.tokens.canvas }"
              @click="pickTheme(item.id)"
            >
              <span
                class="dash-theme-popper__card"
                :style="{
                  background: item.tokens.card,
                  borderRadius: `${dashThemeSwatchRadius(item.tokens.radius)}px`,
                }"
              />
            </button>
          </div>
        </el-popover>
      </div>
      <i class="filter-dock__tools-sep" />
      <div class="filter-dock__design">
        <template v-if="showDesign">
          <el-dropdown
            trigger="hover"
            placement="bottom-end"
            :show-timeout="100"
            :hide-timeout="100"
            @command="onAddCommand"
          >
            <button
              type="button"
              class="filter-dock__btn filter-dock__add"
              aria-label="添加内容"
            >
              <span :class="adding ? 'i-svg-spinners-ring-resize' : 'i-mingcute-add-square-line'" />
            </button>
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
            <button
              type="button"
              class="filter-dock__btn"
              @click="emit('settings')"
            >
              <span class="i-mingcute-settings-3-line" />
            </button>
          </el-tooltip>
          <el-tooltip
            content="重载看板"
            placement="bottom"
            :show-after="200"
          >
            <button
              type="button"
              class="filter-dock__btn"
              @click="emit('reloadCards')"
            >
              <span class="i-mingcute-refresh-anticlockwise-1-line" />
            </button>
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
        </template>
      </div>
    </div>
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
@use '../dashPage.scss' as page;

.filter-dock {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'heading actions'
    'tags tags';
  column-gap: 16px;
  row-gap: 8px;
  align-items: center;
  pointer-events: none;
}

.filter-dock.is-mobile {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'mobile-heading mobile-actions'
    'mobile-filter mobile-filter';
  column-gap: 10px;
  row-gap: 10px;
}

.filter-dock__mobile-heading {
  grid-area: mobile-heading;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 48px;
  pointer-events: auto;
}

.filter-dock__mobile-copy {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  min-width: 0;
}

.filter-dock__mobile-title {
  min-width: 0;
  overflow: hidden;
  color: var(--dash-title, var(--el-text-color-primary));
  font-size: 18px;
  font-weight: 650;
  line-height: 1.2;
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

.filter-dock__mobile-actions {
  grid-area: mobile-actions;
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 8px;
  pointer-events: auto;
}

.filter-dock__mobile-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 12px;
  background: color-mix(in srgb, var(--dash-title, #1f2329) 5%, var(--dash-card-bg, #fff));
  color: var(--dash-content-color, var(--el-text-color-regular));
  cursor: pointer;
  outline: none;
  @include page.frost(btn);

  &:active,
  &.is-active {
    border-color: color-mix(in srgb, var(--dash-accent, #0052d9) 38%, transparent);
    background: color-mix(in srgb, var(--dash-accent, #0052d9) 10%, var(--dash-card-bg, #fff));
    color: var(--dash-accent, var(--el-color-primary));
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--dash-accent, #0052d9) 62%, transparent);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  > span {
    width: 19px;
    height: 19px;
  }
}

.filter-dock__mobile-filter {
  grid-area: mobile-filter;
  display: inline-flex;
  align-items: center;
  justify-self: stretch;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 5px 11px;
  border: 1px solid color-mix(in srgb, var(--dash-border, var(--el-border-color)) 66%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--dash-title, #1f2329) 3.5%, var(--dash-card-bg, #fff));
  color: var(--dash-content-color, var(--el-text-color-regular));
  cursor: pointer;
  outline: none;
  pointer-events: auto;
  @include page.frost(btn);

  &:active {
    background: color-mix(in srgb, var(--dash-title, #1f2329) 6%, var(--dash-card-bg, #fff));
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--dash-accent, #0052d9) 62%, transparent);
    outline-offset: 2px;
  }

  .filter-dock__mobile-filter-icon {
    width: 19px;
    height: 19px;
    color: var(--dash-accent, var(--el-color-primary));
  }

  .filter-dock__mobile-filter-arrow {
    width: 18px;
    height: 18px;
    margin-left: auto;
    color: var(--dash-content-muted, var(--el-text-color-secondary));
  }

  &.is-on {
    border-color: color-mix(in srgb, var(--dash-accent, #0052d9) 42%, transparent);
    background: color-mix(in srgb, var(--dash-accent, #0052d9) 12%, var(--dash-card-bg, #fff));
    color: var(--dash-accent, var(--el-color-primary));
  }
}

.filter-dock__mobile-filter-copy {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  text-align: left;

  > span {
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    overflow: hidden;
    color: var(--dash-content-muted, var(--el-text-color-secondary));
    font-size: 11px;
    font-weight: 400;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.filter-dock__mobile-filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--dash-accent, var(--el-color-primary));
  color: #fff;
  font-size: 12px;
  line-height: 1;
  box-sizing: border-box;
}

@media (hover: hover) and (pointer: fine) {
  .filter-dock__mobile-btn:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--dash-border, var(--el-border-color)) 62%, transparent);
    background: color-mix(in srgb, var(--dash-title, #1f2329) 7%, var(--dash-card-bg, #fff));
  }

  .filter-dock__mobile-filter:hover {
    border-color: color-mix(in srgb, var(--dash-accent, #0052d9) 30%, var(--dash-border, var(--el-border-color)));
    background: color-mix(in srgb, var(--dash-title, #1f2329) 5%, var(--dash-card-bg, #fff));
  }
}

.filter-dock__heading {
  grid-area: heading;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 32px;
  pointer-events: auto;
}

.filter-dock__title {
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 16em;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 32px;
  color: var(--dash-title, var(--el-text-color-primary));
}

.filter-dock__dirty {
  flex-shrink: 0;
  color: var(--el-color-warning);
  font-size: 12px;
}

.filter-dock__loading {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--dash-accent, var(--el-color-primary));
}

.filter-dock__sep {
  flex-shrink: 0;
  width: 1px;
  height: 12px;
  background: color-mix(in srgb, var(--dash-title, #1f2329) 16%, transparent);
}

.filter-dock__desc {
  flex: 1 1 8em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  font-size: 13px;
  line-height: 32px;
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

  &:not(:has(.filter-dock__design > *)) {
    .filter-dock__tools-sep,
    .filter-dock__design {
      display: none;
    }
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
  background: color-mix(in srgb, var(--dash-title, #1f2329) 14%, transparent);
}

.filter-dock__preview {
  display: inline-flex;
}

.filter-dock__save {
  margin-left: 2px;
}

.filter-dock__add {
  gap: 2px;
}

.filter-dock__btn {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: 0;
  overflow: visible;
  border: 1px solid color-mix(in srgb, var(--dash-border, var(--el-border-color)) 78%, transparent);
  border-radius: 8px;
  background: var(--dash-btn-bg, var(--el-bg-color));
  color: var(--dash-content-color, var(--el-text-color-regular));
  @include page.frost(btn);
  cursor: pointer;
  outline: none;
  pointer-events: auto;

  .i-mingcute-palette-line,
  .i-mingcute-refresh-2-line,
  .i-mingcute-refresh-anticlockwise-1-line,
  .i-mingcute-eye-2-line,
  .i-mingcute-camera-2-line,
  .i-mingcute-add-square-line,
  .i-mingcute-new-folder-line,
  .i-mingcute-settings-3-line,
  .i-svg-spinners-ring-resize {
    width: 16px;
    height: 16px;
  }

  .filter-dock__design & {
    background: color-mix(in srgb, var(--dash-accent, #0052d9) 11%, var(--dash-card-bg, #fff));
    border-color: color-mix(in srgb, var(--dash-accent, #0052d9) 26%, transparent);
    color: var(--dash-accent, #0052d9);
  }

  &:hover,
  &.is-active {
    border-color: var(--dash-accent, #0052d9);
    color: var(--dash-accent, #0052d9);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;

    &:hover {
      border-color: var(--dash-border, var(--el-border-color));
      color: var(--dash-content-color, var(--el-text-color-regular));
    }
  }
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
  min-height: 32px;
  pointer-events: auto;
}

.filter-chip {
  display: inline-flex;
  align-items: stretch;
  max-width: 100%;
  height: 28px;
  padding: 0;
  overflow: hidden;
  border: none;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dash-title, #1f2329) 6.5%, var(--dash-card-bg, #fff));
  box-shadow: var(--dash-btn-shadow, none);
  cursor: pointer;
  outline: none;
  transition: background-color 0.15s ease;
  @include page.frost;

  &:hover,
  &.is-open {
    background: color-mix(in srgb, var(--dash-title, #1f2329) 9.5%, var(--dash-card-bg, #fff));
  }

  &.is-on {
    background: color-mix(in srgb, var(--dash-accent, #0052d9) 22%, var(--dash-card-bg, #fff));
  }

  &.is-on:hover,
  &.is-on.is-open {
    background: color-mix(in srgb, var(--dash-accent, #0052d9) 28%, var(--dash-card-bg, #fff));
  }
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
  font-size: 12px;
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

.filter-chip.is-on .filter-chip__k {
  color: color-mix(in srgb, var(--dash-accent, #0052d9) 76%, var(--dash-content-color, #1f2329));
}

.filter-chip__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 16em;
  color: var(--dash-content-color, var(--el-text-color-regular));
  font-size: 13px;
}

.filter-chip:not(.is-on) .filter-chip__value {
  color: var(--dash-content-muted, var(--el-text-color-placeholder));
}

.filter-chip.is-on .filter-chip__value {
  color: var(--dash-accent, var(--el-color-primary));
  font-weight: 600;
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
    background: color-mix(in srgb, var(--dash-accent, #0052d9) 14%, transparent);
    color: var(--dash-accent, var(--el-color-primary));
  }
}

.filter-chip.is-on .filter-chip__clear {
  color: var(--dash-accent, var(--el-color-primary));

  &:hover {
    background: color-mix(in srgb, var(--dash-accent, #0052d9) 14%, transparent);
    color: var(--dash-accent, var(--el-color-primary));
  }
}
</style>

<style lang="scss">
.dash-mobile-tools-popper {
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

.dash-mobile-tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.dash-mobile-tools__desc {
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
    display: -webkit-box;
    overflow: hidden;
    color: var(--dash-mobile-content, var(--el-text-color-regular));
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
  }
}

.dash-mobile-tools__action {
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--dash-mobile-content, var(--el-text-color-regular));
  font-size: 14px;
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

.dash-mobile-tools__themes {
  padding: 6px 8px 8px;
}

.dash-mobile-tools__label {
  display: block;
  padding: 0 2px 7px;
  color: var(--dash-mobile-muted, var(--el-text-color-secondary));
  font-size: 12px;
}

.dash-mobile-tools__theme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.dash-mobile-tools__theme {
  display: flex;
  align-items: flex-end;
  box-sizing: border-box;
  min-width: 0;
  height: 48px;
  padding: 5px;
  border: 2px solid transparent;
  border-radius: 10px;
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

  > span {
    width: 100%;
    height: 100%;
    border: 1px solid rgb(15 23 42 / 8%);
    box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
  }
}

.dash-mobile-tools__sep {
  display: block;
  height: 1px;
  margin: 2px 8px;
  background: color-mix(in srgb, var(--dash-mobile-border, var(--el-border-color)) 52%, transparent);
}

.dash-mobile-tools__design-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}

@media (hover: hover) and (pointer: fine) {
  .dash-mobile-tools__action:hover:not(:disabled) {
    background: var(--dash-mobile-soft, var(--el-fill-color-light));
  }

  .dash-mobile-tools__theme:hover {
    border-color: color-mix(in srgb, var(--dash-mobile-accent, var(--el-color-primary)) 54%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dash-mobile-tools-popper {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

.dash-theme-popper {
  padding: 8px !important;
}

.dash-theme-popper__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.dash-theme-popper__item {
  display: flex;
  align-items: flex-end;
  box-sizing: border-box;
  height: 52px;
  padding: 6px;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;

  &:hover,
  &.is-active {
    border-color: var(--el-color-primary);
  }
}

.dash-theme-popper__card {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid rgb(15 23 42 / 8%);
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
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
