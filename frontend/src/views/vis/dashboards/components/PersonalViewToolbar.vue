<script setup lang="ts">
import type { VisActionGroup } from '@/views/vis/shared/VisActionPopover.vue'
import { createReusableTemplate } from '@vueuse/core'
import { ElMessageBox } from 'element-plus'
import CustomDialog from '@/components/CustomDialog.vue'
import VisActionButton from '@/views/vis/shared/VisActionButton.vue'
import VisActionPopover from '@/views/vis/shared/VisActionPopover.vue'
import { DASHBOARD_VIEW_COPY as copy } from '../dashboardViewCopy'

const props = defineProps<{
  views: VIS.PersonalViewInfo[]
  selectedId: string
  defaultViewId?: string
  linked?: boolean
  dirty: boolean
  busy: boolean
  showSwitcher: boolean
  canSave: boolean
  surfaceStyle?: Record<string, string>
}>()
const emit = defineEmits<{
  choose: [id: string]
  save: [name: string, update: boolean]
  rename: [name: string, id: string]
  remove: [id: string]
  setDefault: [clear: boolean, id: string]
}>()
const open = ref(false)
const dialogOpen = ref(false)
const rowMenuId = ref('')
const [DefineMenu, ReuseMenu] = createReusableTemplate()
const optionsRef = ref<HTMLElement>()
const selected = computed(() => props.views.find(view => view.id === props.selectedId))
const temporary = computed(() => !selected.value && (props.linked || props.dirty))
const currentName = computed(() => selected.value?.viewName || (temporary.value ? copy.currentName : copy.defaultName))
const hasChanges = computed(() => props.dirty || props.linked)

function actionsOf(view: VIS.PersonalViewInfo): VisActionGroup[] {
  const isDefault = props.defaultViewId === view.id
  return [
    { id: 'edit', label: '视图设置', items: [
      { key: isDefault ? 'clearDefault' : 'default', label: isDefault ? copy.clearDefault : copy.setDefault, icon: 'i-mingcute-pin-line', visible: props.canSave || isDefault, disabled: props.busy },
      { key: 'rename', label: '重命名', icon: 'i-mingcute-edit-2-line', disabled: props.busy },
    ] },
    { id: 'delete', label: '删除视图', items: [
      { key: 'delete', label: '删除', icon: 'i-mingcute-delete-2-line', danger: true, disabled: props.busy },
    ] },
  ]
}

async function command(value: string, view = selected.value) {
  if (props.busy)
    return
  if (['save', 'update'].includes(value) && !props.canSave)
    return
  open.value = false
  rowMenuId.value = ''
  try {
    if (value === 'save' || value === 'rename') {
      const response = await ElMessageBox.prompt(value === 'save' ? copy.saveDescription : '视图名称', value === 'save' ? copy.save : '重命名视图', {
        customStyle: props.surfaceStyle,
        inputValue: value === 'rename' ? view?.viewName || '' : '',
        inputPlaceholder: '输入视图名称',
        inputValidator: input => !input?.trim() ? '请输入视图名称' : input.trim().length <= 80 || '视图名称不能超过 80 个字符',
        confirmButtonText: '保存',
        cancelButtonText: '取消',
      })
      if (value === 'save')
        emit('save', response.value.trim(), false)
      else if (view?.id)
        emit('rename', response.value.trim(), view.id)
    }
    else if (value === 'update' && selected.value) {
      emit('save', selected.value.viewName || '', true)
    }
    else if (value === 'delete' && view?.id) {
      await ElMessageBox.confirm(`删除“${view.viewName}”后无法恢复。`, '删除视图', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消', customStyle: props.surfaceStyle })
      emit('remove', view.id)
    }
    else if (value === 'default' && view?.id) {
      emit('setDefault', false, view.id)
    }
    else if (value === 'clearDefault' && view?.id) {
      emit('setDefault', true, view.id)
    }
  }
  catch { /* 关闭或取消命名对话框。 */ }
}
function choose(id: string) {
  open.value = false
  emit('choose', id)
}

function closeMenu() {
  open.value = false
  dialogOpen.value = false
  rowMenuId.value = ''
}

async function openMenu() {
  if (props.busy)
    return
  open.value = true
  await nextTick()
  const options = optionsRef.value
  const target = options?.querySelector<HTMLButtonElement>('[aria-pressed="true"]:not(:disabled)')
    || options?.querySelector<HTMLButtonElement>('button:not(:disabled)')
  target?.focus()
}

function moveFocus(event: KeyboardEvent, offset: number) {
  if (!(event.target instanceof HTMLElement) || !event.target.hasAttribute('data-view-option'))
    return
  const buttons = [...(optionsRef.value?.querySelectorAll<HTMLButtonElement>('[data-view-option]:not(:disabled)') || [])]
  if (!buttons.length)
    return
  const index = buttons.findIndex(button => button === event.target)
  buttons[(index + offset + buttons.length) % buttons.length]?.focus()
}

watch(() => props.showSwitcher, () => open.value = false)
watch(open, (value) => {
  if (!value)
    rowMenuId.value = ''
})
watch(dialogOpen, (value) => {
  if (!value)
    rowMenuId.value = ''
})
defineExpose({ saveAs: () => command('save'), manage: () => dialogOpen.value = true })
</script>

<template>
  <DefineMenu>
    <div class="personal-view-menu" @keydown.esc.stop="closeMenu">
      <div v-if="!dialogOpen" class="personal-view-menu__heading">
        <span>{{ copy.title }}</span>
        <span v-if="hasChanges" class="personal-view-menu__status">未保存</span>
      </div>
      <div ref="optionsRef" class="personal-view-menu__options" role="group" :aria-label="dialogOpen ? copy.savedGroup : '可选视图'" @keydown.down.prevent="moveFocus($event, 1)" @keydown.up.prevent="moveFocus($event, -1)">
        <button v-if="!dialogOpen" type="button" data-view-option class="personal-view-menu__option" :class="{ 'is-selected': !selectedId && !temporary }" :aria-pressed="!selectedId && !temporary" :disabled="busy" @click="choose('')">
          <span class="personal-view-menu__name">{{ copy.defaultName }}</span>
          <span class="personal-view-menu__check" :class="{ 'i-mingcute-check-line': !selectedId && !temporary }" />
        </button>
        <div v-if="views.length && !dialogOpen" class="personal-view-menu__section">
          {{ copy.savedGroup }}
        </div>
        <div v-for="view in views" :key="view.id" class="personal-view-menu__row" :class="{ 'is-selected': !dialogOpen && selectedId === view.id }">
          <component
            :is="dialogOpen ? 'div' : 'button'"
            :type="dialogOpen ? undefined : 'button'"
            :data-view-option="dialogOpen ? undefined : ''"
            class="personal-view-menu__option"
            :aria-pressed="dialogOpen ? undefined : selectedId === view.id"
            :disabled="!dialogOpen && busy"
            @click="!dialogOpen && choose(view.id || '')"
          >
            <span class="personal-view-menu__name" :title="view.viewName">{{ view.viewName }}</span>
            <span v-if="view.id === defaultViewId" class="personal-view-menu__default">{{ copy.defaultBadge }}</span>
            <span v-if="!dialogOpen" class="personal-view-menu__check" :class="{ 'i-mingcute-check-line': selectedId === view.id }" />
          </component>
          <VisActionPopover
            :open="rowMenuId === view.id" :label="`${view.viewName}的操作`" :groups="actionsOf(view)" :surface-style="surfaceStyle"
            @update:open="rowMenuId = $event ? view.id || '' : ''"
            @action="command($event, view)"
          >
            <VisActionButton :label="`${view.viewName}的操作`" :disabled="busy" :active="rowMenuId === view.id" class="personal-view-menu__row-action">
              <span class="i-mingcute-more-2-line" />
            </VisActionButton>
          </VisActionPopover>
        </div>
        <div v-if="!views.length && dialogOpen" class="personal-view-menu__empty">
          暂无保存的视图
        </div>
      </div>
      <div v-if="!dialogOpen && canSave && hasChanges" class="personal-view-menu__footer">
        <el-button size="small" type="primary" :disabled="busy" @click="command(selected && dirty ? 'update' : 'save')">
          {{ selected && dirty ? copy.saveChanges : copy.save }}
        </el-button>
        <button v-if="selected && dirty" type="button" class="personal-view-menu__secondary" :disabled="busy" @click="command('save')">
          {{ copy.saveAs }}
        </button>
        <button v-if="selected && dirty" type="button" class="personal-view-menu__secondary" :disabled="busy" @click="choose(selectedId)">
          {{ copy.restore }}
        </button>
      </div>
    </div>
  </DefineMenu>
  <div v-if="showSwitcher" class="personal-view-toolbar">
    <el-popover
      v-model:visible="open" trigger="click" placement="bottom-end" :width="320"
      :disabled="busy" :show-arrow="false" :popper-style="{ ...surfaceStyle, padding: '0', maxWidth: 'calc(100vw - 24px)', borderRadius: '8px' }"
      popper-class="personal-view-popper" role="dialog"
    >
      <template #reference>
        <button
          type="button" class="personal-view-toolbar__trigger" :disabled="busy"
          :title="currentName" :aria-label="`切换视图：${currentName}${hasChanges ? '，未保存' : ''}`" aria-haspopup="dialog" :aria-expanded="open"
          @keydown.down.prevent="openMenu" @keydown.esc.stop="open = false"
        >
          <span class="personal-view-toolbar__icon" :class="busy ? 'i-svg-spinners-ring-resize' : 'i-mingcute-bookmark-line'" />
          <span class="personal-view-toolbar__name">{{ currentName }}</span>
          <span v-if="hasChanges" class="personal-view-toolbar__modified" aria-hidden="true" />
          <span class="i-mingcute-down-line" />
        </button>
      </template>
      <ReuseMenu />
    </el-popover>
  </div>
  <CustomDialog v-model:visible="dialogOpen" :title="copy.manage" size="" width="400px" :show-footer="false" :style="surfaceStyle" append-to-body>
    <template #custom-dialog-body>
      <ReuseMenu />
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
@use '@/theme/presentation.scss' as ui;

.personal-view-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}
.personal-view-toolbar__trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  max-width: 180px;
  padding: 0 10px;
  border: 1px solid var(--dash-border, var(--el-border-color-lighter));
  border-radius: 6px;
  background: transparent;
  color: var(--dash-content-color, var(--el-text-color-regular));
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  @include ui.focus-ring;

  &:hover:not(:disabled) {
    background: var(--el-fill-color-light);
  }
  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
  > span:not(.personal-view-toolbar__name) {
    flex-shrink: 0;
  }
}
.personal-view-toolbar__name,
.personal-view-menu__name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.personal-view-toolbar__modified {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--el-color-primary);
}
.personal-view-menu__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 6px;
  color: var(--el-text-color-primary);
  font-size: 13px;
  font-weight: 600;
}
.personal-view-menu__status {
  color: var(--el-text-color-secondary);
  font-size: 11px;
  font-weight: 400;
}
.personal-view-menu__options {
  padding: 6px;
  max-height: 320px;
  overflow-y: auto;
}
.personal-view-menu__section {
  margin-top: 6px;
  padding: 12px 8px 6px;
  border-top: 1px solid var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
  font-size: 11px;
}
.personal-view-menu__row {
  display: flex;
  align-items: center;
  padding-right: 4px;
  border-radius: 6px;
  color: var(--el-text-color-regular);

  &:hover,
  &:focus-within {
    background: var(--el-fill-color-light);
  }
  &.is-selected {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
  .personal-view-menu__option:hover:not(:disabled) {
    background: transparent;
  }
}
.personal-view-menu__row-action {
  color: var(--el-text-color-secondary);
}
.personal-view-menu__option {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  @include ui.focus-ring;

  &:hover:not(:disabled) {
    background: var(--el-fill-color-light);
  }
  &.is-selected {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
  .personal-view-menu__name {
    flex: 1;
  }
}
div.personal-view-menu__option {
  cursor: default;
}
.personal-view-menu__default {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 16px;
}
.personal-view-menu__check {
  flex: 0 0 14px;
  width: 14px;
  height: 14px;
  color: var(--el-color-primary);
}
.personal-view-menu__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  > .el-button {
    flex: 1;
    min-height: 30px;
  }
}
.personal-view-menu__secondary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--el-text-color-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  @include ui.focus-ring;

  &:hover:not(:disabled) {
    color: var(--el-color-primary);
  }
}
.personal-view-menu__empty {
  padding: 28px 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-align: center;
}
@container (max-width: 560px) {
  .personal-view-toolbar__trigger {
    max-width: 108px;
    height: 28px;
    padding: 0 6px;
  }
  .personal-view-toolbar__icon {
    display: none;
  }
}
@media (hover: none), (pointer: coarse) {
  .personal-view-menu__option,
  .personal-view-menu__secondary {
    min-height: 44px;
  }
}
</style>
