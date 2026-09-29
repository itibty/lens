<script setup lang="ts">
import type { VisActionGroup, VisPopoverAction } from '@/views/vis/shared/VisActionPopover.vue'
import VisActionPopover from '@/views/vis/shared/VisActionPopover.vue'
import { DASHBOARD_VIEW_COPY as viewCopy } from '../dashboardViewCopy'

export type DashToolAction = 'favorite' | 'preview' | 'screenshot' | 'subscription' | 'settings' | 'reloadCards' | 'save' | 'addCard' | 'addText' | 'addGroup' | 'share' | 'saveView' | 'manageViews' | 'resetView'

const props = defineProps<{
  mobile: boolean
  surfaceStyle: Record<string, string>
  showDesign: boolean
  showPreview: boolean
  previewDisabled: boolean
  showFavorite: boolean
  favorite: boolean
  favoriteBusy: boolean
  showSubscription: boolean
  showShare?: boolean
  viewActions?: VisPopoverAction[]
  loading: boolean
  screenshotting: boolean
  adding: boolean
  saveLoading: boolean
  saveDisabled: boolean
}>()
const emit = defineEmits<{ action: [action: DashToolAction] }>()
const open = defineModel<boolean>('open', { default: false })
const groups = computed<VisActionGroup[]>(() => [
  {
    id: 'view',
    label: '看板操作',
    items: [
      { key: 'preview', label: '预览', icon: 'i-mingcute-eye-2-line', visible: !props.mobile && props.showPreview, disabled: props.previewDisabled },
      { key: 'screenshot', label: '截屏', icon: props.screenshotting ? 'i-svg-spinners-ring-resize' : 'i-mingcute-camera-line', disabled: props.loading || props.screenshotting, attrs: { 'data-dashboard-screenshot-action': '' } },
      { key: 'favorite', label: '收藏', title: props.favorite ? '取消收藏' : '收藏', icon: props.favorite ? 'i-mingcute-star-fill' : 'i-mingcute-star-line', visible: props.showFavorite, disabled: props.favoriteBusy, active: props.favorite },
      { key: 'subscription', label: '订阅', icon: 'i-mingcute-mail-send-line', visible: props.showSubscription },
      { key: 'share', label: viewCopy.share, icon: 'i-mingcute-link-line', visible: !!props.showShare },
    ],
  },
  { id: 'personal', label: viewCopy.title, items: props.viewActions || [] },
  ...props.mobile && props.showDesign
    ? [
        {
          id: 'add',
          label: '添加内容',
          items: [
            { key: 'addCard', label: '添加卡片', icon: props.adding ? 'i-svg-spinners-ring-resize' : 'i-mingcute-layout-grid-line', disabled: props.adding },
            { key: 'addText', label: '添加标注', icon: 'i-mingcute-paragraph-line' },
            { key: 'addGroup', label: '添加分组', icon: 'i-mingcute-new-folder-line' },
          ],
        },
        {
          id: 'design',
          label: '看板设计',
          items: [
            { key: 'settings', label: '配置', icon: 'i-mingcute-settings-3-line' },
            { key: 'save', label: '保存', icon: props.saveLoading ? 'i-svg-spinners-ring-resize' : 'i-mingcute-save-2-line', disabled: props.saveDisabled || props.saveLoading, primary: true },
            { key: 'reloadCards', label: '重载', title: '重载看板', icon: 'i-mingcute-refresh-anticlockwise-1-line' },
          ],
        },
      ]
    : [],
])
</script>

<template>
  <VisActionPopover
    v-model:open="open" label="看板操作" :groups="groups"
    :surface-style="surfaceStyle" :touch="mobile" popper-class="dash-tools-popper"
    @action="emit('action', $event as DashToolAction)"
  >
    <slot />
  </VisActionPopover>
</template>
