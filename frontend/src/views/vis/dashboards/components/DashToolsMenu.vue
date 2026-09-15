<script setup lang="ts">
import type { DashThemeId } from '../dashTheme'
import { DASH_THEME_PRESETS, dashThemeCanvasSwatchStyle, dashThemeSwatchStyle } from '../dashTheme'

export type DashToolAction = 'favorite' | 'preview' | 'screenshot' | 'subscription' | 'settings' | 'reloadCards' | 'save' | 'addCard' | 'addText' | 'addGroup'

interface MenuAction {
  id: DashToolAction
  label: string
  icon: string
  visible?: boolean
  disabled?: boolean
  pressed?: boolean
  primary?: boolean
}

const props = defineProps<{
  desc: string
  mobile: boolean
  showDesign: boolean
  showPreview: boolean
  previewDisabled: boolean
  showFavorite: boolean
  favorite: boolean
  favoriteBusy: boolean
  showSubscription: boolean
  loading: boolean
  screenshotting: boolean
  adding: boolean
  saveLoading: boolean
  saveDisabled: boolean
}>()
const emit = defineEmits<{ action: [action: DashToolAction] }>()
const theme = defineModel<DashThemeId>('theme', { required: true })
const gridGuides = defineModel<boolean>('gridGuides', { required: true })
const currentTheme = computed(() => DASH_THEME_PRESETS.find(item => item.id === theme.value)?.name)
const actions = computed<MenuAction[]>(() => [
  { id: 'favorite', label: props.favorite ? '取消收藏' : '收藏报表', icon: props.favorite ? 'i-mingcute-star-fill' : 'i-mingcute-star-line', visible: props.showFavorite, disabled: props.favoriteBusy, pressed: props.favorite },
  { id: 'preview', label: '独立预览', icon: 'i-mingcute-eye-2-line', visible: !props.mobile && !props.showDesign && props.showPreview, disabled: props.previewDisabled },
  { id: 'screenshot', label: props.screenshotting ? '正在截屏…' : '一键截屏', icon: props.screenshotting ? 'i-svg-spinners-ring-resize' : 'i-mingcute-camera-2-line', disabled: props.loading || props.screenshotting },
  { id: 'subscription', label: '邮件订阅', icon: 'i-mingcute-mail-send-line', visible: props.showSubscription },
])
const visibleActions = computed(() => actions.value.filter(action => action.visible !== false))
const designActions = computed<MenuAction[]>(() => [
  { id: 'addCard', label: '添加卡片', icon: props.adding ? 'i-svg-spinners-ring-resize' : 'i-mingcute-layout-grid-line', disabled: props.adding },
  { id: 'addText', label: '添加标注', icon: 'i-mingcute-paragraph-line' },
  { id: 'addGroup', label: '添加分组', icon: 'i-mingcute-new-folder-line' },
  { id: 'settings', label: '配置', icon: 'i-mingcute-settings-3-line' },
  { id: 'reloadCards', label: '重载看板', icon: 'i-mingcute-refresh-anticlockwise-1-line' },
  { id: 'save', label: '保存', icon: props.saveLoading ? 'i-svg-spinners-ring-resize' : 'i-mingcute-save-2-line', disabled: props.saveDisabled || props.saveLoading, primary: true },
])
</script>

<template>
  <div class="dash-tools" :class="{ 'is-touch': mobile }">
    <p v-if="desc" class="dash-tools__desc" :title="desc">
      {{ desc }}
    </p>

    <div class="dash-tools__actions" role="group" aria-label="看板操作">
      <button
        v-for="action in visibleActions" :key="action.id"
        type="button" class="dash-tools__action"
        :disabled="action.disabled" :aria-pressed="action.pressed"
        :data-dashboard-screenshot-action="action.id === 'screenshot' ? '' : undefined"
        @click="emit('action', action.id)"
      >
        <span :class="action.icon" />
        <span>{{ action.label }}</span>
      </button>
    </div>

    <section class="dash-tools__themes" aria-label="看板主题">
      <div class="dash-tools__section-heading">
        <span>主题</span>
        <span>{{ currentTheme }}</span>
      </div>
      <div class="dash-tools__theme-grid">
        <button
          v-for="item in DASH_THEME_PRESETS" :key="item.id"
          type="button" class="dash-tools__theme"
          :class="{ 'is-active': theme === item.id }"
          :aria-label="`切换为${item.name}主题`" :aria-pressed="theme === item.id"
          @click="theme = item.id"
        >
          <span class="dash-tools__swatch" :style="dashThemeCanvasSwatchStyle(item)">
            <i :style="dashThemeSwatchStyle(item)" />
          </span>
          <span class="dash-tools__theme-name">{{ item.name }}</span>
        </button>
      </div>
    </section>

    <section v-if="mobile && showDesign" class="dash-tools__design" aria-label="看板设计">
      <div class="dash-tools__section-heading">
        <span>设计</span>
        <button
          type="button" class="dash-tools__guides"
          :aria-pressed="gridGuides" :disabled="loading || screenshotting"
          @click="gridGuides = !gridGuides"
        >
          <span class="i-mingcute-grid-line" />辅助线
        </button>
      </div>
      <div class="dash-tools__actions">
        <button
          v-for="action in designActions" :key="action.id"
          type="button" class="dash-tools__action"
          :class="{ 'is-primary': action.primary }"
          :disabled="action.disabled" @click="emit('action', action.id)"
        >
          <span :class="action.icon" />
          <span>{{ action.label }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/theme/presentation.scss' as ui;

:global(.dash-tools-popper) {
  box-sizing: border-box;
  max-width: calc(100vw - 24px);
  max-height: min(72dvh, 620px);
  padding: 10px !important;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid var(--dash-mobile-border, var(--el-border-color-light)) !important;
  border-radius: 10px !important;
  background: var(--dash-mobile-surface, var(--el-bg-color-overlay)) !important;
  box-shadow: var(--dash-mobile-popper-shadow, 0 8px 24px rgb(15 23 42 / 10%)) !important;
  color: var(--dash-mobile-content, var(--el-text-color-regular));
  overscroll-behavior: contain;
}

.dash-tools {
  --dash-tools-action-height: 36px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;

  &.is-touch {
    --dash-tools-action-height: 44px;
  }
}
.dash-tools__desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin: 0;
  padding: 2px 6px;
  color: var(--dash-mobile-muted, var(--el-text-color-secondary));
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;
}
.dash-tools__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
}
.dash-tools__action {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: var(--dash-tools-action-height);
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dash-mobile-content, var(--el-text-color-regular));
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  @include ui.focus-ring;

  &:hover:not(:disabled),
  &:active:not(:disabled) {
    background: var(--dash-mobile-soft, var(--el-fill-color-light));
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }
  &.is-primary {
    color: var(--dash-mobile-accent, var(--el-color-primary));
  }
  > span:first-child {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
  }
}
.dash-tools__themes,
.dash-tools__design {
  padding-top: 8px;
  border-top: 1px solid var(--dash-mobile-border, var(--el-border-color-lighter));
}
.dash-tools__section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 20px;
  padding: 0 6px 6px;
  color: var(--dash-mobile-muted, var(--el-text-color-secondary));
  font-size: 12px;
}
.dash-tools__theme-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.dash-tools__theme {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--dash-mobile-content, var(--el-text-color-regular));
  cursor: pointer;
  @include ui.focus-ring;

  &:hover {
    background: var(--dash-mobile-soft, var(--el-fill-color-light));
  }
  &.is-active {
    border-color: var(--dash-mobile-accent, var(--el-color-primary));
    color: var(--dash-mobile-accent, var(--el-color-primary));
  }
}
.dash-tools__swatch {
  display: flex;
  width: 100%;
  height: 40px;
  padding: 5px;
  box-sizing: border-box;
  border-radius: 4px;

  > i {
    flex: 1;
    min-width: 0;
  }
}
.dash-tools__theme-name {
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
}
.dash-tools__guides {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  @include ui.focus-ring;

  &[aria-pressed='true'] {
    color: var(--dash-mobile-accent, var(--el-color-primary));
  }
  &:disabled {
    opacity: 0.48;
    cursor: not-allowed;
  }
}
@media (hover: none), (pointer: coarse) {
  .dash-tools {
    --dash-tools-action-height: 44px;
  }
}
</style>
