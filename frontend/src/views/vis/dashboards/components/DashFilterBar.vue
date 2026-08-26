<!--
 * @Description: 看板顶栏：标题 / 描述、筛选 tag、右侧工具。筛选草稿在 useDashFilterChips。
-->
<script setup lang="ts">
import type { DashFilterValues, VisDashFilterDef } from '../dashApi'
import type { DashThemeId } from '../dashTheme'
import { useEventListener } from '@vueuse/core'
import { DASH_THEME_PRESETS, dashThemeSwatchRadius, DEFAULT_DASH_THEME } from '../dashTheme'
import { isDashPopperTarget, useDashFilterChips } from '../useDashFilterChips'
import { useDashFilterLabels } from '../useDashFilterOptions'
import DashFilterChipFields from './DashFilterChipFields.vue'

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
})
const emit = defineEmits<{
  refresh: []
  reloadCards: []
  preview: []
  screenshot: []
  addCard: []
  addGroup: []
  settings: []
  save: []
}>()
const theme = defineModel<DashThemeId>('theme', { default: DEFAULT_DASH_THEME })
const values = defineModel<DashFilterValues>('values', { required: true })
const themeOpen = ref(false)
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
  chipOp,
  displayText,
  popperWidth,
} = useDashFilterChips(values)
const { labelsOf } = useDashFilterLabels(() => props.defs, values)

function pickTheme(id: DashThemeId) {
  theme.value = id
  themeOpen.value = false
}

const descText = computed(() => props.desc.trim().replace(/\s+/g, ' '))

function onPageScroll(event: Event) {
  if (isDashPopperTarget(event.target))
    return
  if (openUid.value)
    discardChip()
  themeOpen.value = false
}

useEventListener(window, 'scroll', onPageScroll, true)
</script>

<template>
  <div class="filter-dock">
    <div
      v-if="title || descText"
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
    <div class="filter-dock__right">
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
          <el-tooltip
            content="添加卡片"
            placement="bottom"
            :show-after="200"
          >
            <span>
              <button
                type="button"
                class="filter-dock__btn"
                :disabled="adding"
                @click="emit('addCard')"
              >
                <span :class="adding ? 'i-svg-spinners-ring-resize' : 'i-mingcute-add-square-line'" />
              </button>
            </span>
          </el-tooltip>
          <el-tooltip
            content="添加分组"
            placement="bottom"
            :show-after="200"
          >
            <button
              type="button"
              class="filter-dock__btn"
              @click="emit('addGroup')"
            >
              <span class="i-mingcute-new-folder-line" />
            </button>
          </el-tooltip>
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
            content="重载卡片"
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
      v-if="defs.length"
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
            <span class="filter-chip__k">{{ chipLabel(def) }}</span>
            <span class="filter-chip__v">
              <span
                v-if="chipOp(def)"
                class="filter-chip__op"
              >{{ chipOp(def) }}</span>
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
  color: var(--el-text-color-secondary);
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
  color: var(--el-text-color-regular);
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
    background: color-mix(in srgb, var(--dash-accent, #3370ff) 11%, var(--dash-card-bg, #fff));
    border-color: color-mix(in srgb, var(--dash-accent, #3370ff) 26%, transparent);
    color: var(--dash-accent, #3370ff);
  }

  &:hover,
  &.is-active {
    border-color: var(--dash-accent, #3370ff);
    color: var(--dash-accent, #3370ff);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;

    &:hover {
      border-color: var(--dash-border, var(--el-border-color));
      color: var(--el-text-color-regular);
    }
  }
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
    background: color-mix(in srgb, var(--dash-accent, #3370ff) 12%, var(--dash-card-bg, #fff));
  }

  &.is-on:hover,
  &.is-on.is-open {
    background: color-mix(in srgb, var(--dash-accent, #3370ff) 16%, var(--dash-card-bg, #fff));
  }
}

.filter-chip__k,
.filter-chip__op,
.filter-chip__value {
  line-height: 1;
}

.filter-chip__k {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  padding: 0 10px 0 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.filter-chip__v {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding: 0 10px 0 8px;
  box-shadow: inset 1px 0 0 color-mix(in srgb, var(--dash-title, #1f2329) 8%, transparent);
}

.filter-chip.is-on .filter-chip__v {
  padding-right: 6px;
}

.filter-chip__op {
  flex-shrink: 0;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

.filter-chip__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 16em;
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.filter-chip:not(.is-on) .filter-chip__value {
  color: var(--el-text-color-placeholder);
}

.filter-chip.is-on .filter-chip__value {
  color: var(--dash-accent, var(--el-color-primary));
}

.filter-chip__clear {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  color: var(--el-text-color-secondary);

  .i-mingcute-close-line {
    width: 11px;
    height: 11px;
  }

  &:hover {
    background: color-mix(in srgb, var(--dash-accent, #3370ff) 14%, transparent);
    color: var(--dash-accent, var(--el-color-primary));
  }
}
</style>

<style lang="scss">
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
