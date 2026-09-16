<script setup lang="ts">
import { ElMessageBox } from 'element-plus'

const props = defineProps<{
  views: VIS.PersonalViewInfo[]
  selectedId: string
  defaultViewId?: string
  linked?: boolean
  dirty: boolean
  busy: boolean
  surfaceStyle?: Record<string, string>
}>()
const emit = defineEmits<{
  choose: [id: string]
  save: [name: string, update: boolean]
  rename: [name: string]
  remove: []
  setDefault: [clear: boolean]
  share: []
}>()
const open = ref(false)
const optionsRef = ref<HTMLElement>()
const selected = computed(() => props.views.find(view => view.id === props.selectedId))

async function command(value: string) {
  if (props.busy)
    return
  open.value = false
  try {
    if (value === 'save' || value === 'rename') {
      const response = await ElMessageBox.prompt('视图名称', value === 'save' ? '保存视图' : '重命名', {
        inputValue: selected.value?.viewName || '',
        inputPlaceholder: '例如：华东销售',
        inputValidator: input => (!!input?.trim() && input.trim().length <= 80) || '请输入 1 至 80 个字符',
        confirmButtonText: '保存',
        cancelButtonText: '取消',
      })
      if (value === 'save')
        emit('save', response.value.trim(), false)
      else emit('rename', response.value.trim())
    }
    else if (value === 'update' && selected.value) {
      emit('save', selected.value.viewName || '', true)
    }
    else if (value === 'delete') {
      await ElMessageBox.confirm(`删除“${selected.value?.viewName || '当前视图'}”？`, '删除视图', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
      emit('remove')
    }
    else if (value === 'default') {
      emit('setDefault', false)
    }
    else if (value === 'clearDefault') {
      emit('setDefault', true)
    }
    else if (value === 'share') {
      emit('share')
    }
  }
  catch { /* 关闭或取消命名对话框。 */ }
}
function choose(id: string) {
  open.value = false
  emit('choose', id)
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
  const buttons = [...(optionsRef.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])]
  if (!buttons.length)
    return
  const index = buttons.findIndex(button => button === event.target)
  buttons[(index + offset + buttons.length) % buttons.length]?.focus()
}
</script>

<template>
  <div class="personal-view-toolbar">
    <el-popover
      v-model:visible="open" trigger="click" placement="bottom-end" :width="280"
      :disabled="busy" :show-arrow="false" :popper-style="{ ...surfaceStyle, padding: '0' }"
      popper-class="personal-view-popper" role="dialog"
    >
      <template #reference>
        <button
          type="button" class="personal-view-toolbar__trigger" :disabled="busy"
          :title="selected?.viewName || (linked ? '链接视图' : '原始视图')"
          aria-label="切换视图" aria-haspopup="dialog" :aria-expanded="open"
          @keydown.down.prevent="openMenu" @keydown.esc.stop="open = false"
        >
          <span class="personal-view-toolbar__icon" :class="busy ? 'i-svg-spinners-ring-resize' : 'i-mingcute-layout-grid-line'" />
          <span class="personal-view-toolbar__name">{{ selected?.viewName || (linked ? '链接视图' : '原始视图') }}</span>
          <span v-if="dirty" class="personal-view-toolbar__dot" title="未保存" aria-label="未保存" />
          <span class="i-mingcute-down-line" />
        </button>
      </template>
      <div class="personal-view-menu" @keydown.esc.stop="open = false">
        <div class="personal-view-menu__heading">
          视图
        </div>
        <div ref="optionsRef" class="personal-view-menu__options" role="group" aria-label="可选视图" @keydown.down.prevent="moveFocus($event, 1)" @keydown.up.prevent="moveFocus($event, -1)">
          <button type="button" class="personal-view-menu__option" :class="{ 'is-selected': !selectedId && !linked }" :aria-pressed="!selectedId && !linked" :disabled="busy" @click="choose('')">
            <span class="personal-view-menu__name">原始视图</span>
            <span v-if="!defaultViewId" class="personal-view-menu__default">默认</span>
            <span class="personal-view-menu__check" :class="{ 'i-mingcute-check-line': !selectedId && !linked }" />
          </button>
          <button v-if="linked && !selectedId" type="button" class="personal-view-menu__option is-selected" disabled aria-pressed="true">
            <span class="personal-view-menu__name">链接视图</span>
            <span class="personal-view-menu__check i-mingcute-check-line" />
          </button>
          <button v-for="view in views" :key="view.id" type="button" class="personal-view-menu__option" :class="{ 'is-selected': selectedId === view.id }" :aria-pressed="selectedId === view.id" :disabled="busy" @click="choose(view.id || '')">
            <span class="personal-view-menu__name" :title="view.viewName">{{ view.viewName }}</span>
            <span v-if="view.id === defaultViewId" class="personal-view-menu__default">默认</span>
            <span class="personal-view-menu__check" :class="{ 'i-mingcute-check-line': selectedId === view.id }" />
          </button>
        </div>
        <div class="personal-view-menu__footer">
          <el-button size="small" type="primary" :disabled="busy" @click="command(selected && dirty ? 'update' : 'save')">
            <span :class="selected && dirty ? 'i-mingcute-check-line' : 'i-mingcute-add-line'" class="mr-1" />
            {{ selected && dirty ? '保存修改' : '保存为新视图' }}
          </el-button>
          <el-dropdown v-if="selected" trigger="click" placement="bottom-end" :teleported="false" :disabled="busy" :popper-style="surfaceStyle" @command="command">
            <button type="button" class="personal-view-menu__manage" :disabled="busy">
              管理<span class="i-mingcute-down-line" />
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="dirty" command="save">
                  另存为新视图
                </el-dropdown-item>
                <el-dropdown-item command="rename">
                  重命名
                </el-dropdown-item>
                <el-dropdown-item v-if="selectedId !== defaultViewId" command="default">
                  设为默认
                </el-dropdown-item>
                <el-dropdown-item v-else command="clearDefault">
                  取消默认
                </el-dropdown-item>
                <el-dropdown-item command="share" divided>
                  复制视图链接
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided class="personal-view-menu__delete">
                  删除视图
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <button v-else type="button" class="personal-view-menu__manage" :disabled="busy" @click="command('share')">
            <span class="i-mingcute-link-line" />复制链接
          </button>
        </div>
      </div>
    </el-popover>
  </div>
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
.personal-view-toolbar__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--el-color-warning);
}
.personal-view-menu__heading {
  padding: 14px 16px 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.personal-view-menu__options {
  padding: 0 8px 8px;
  max-height: 280px;
  overflow-y: auto;
}
.personal-view-menu__option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 8px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--el-text-color-regular);
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
.personal-view-menu__default {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--el-fill-color);
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  border-radius: 0 0 4px 4px;
  background: var(--el-fill-color-lighter);
}
.personal-view-menu__manage {
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
.personal-view-menu__delete {
  color: var(--el-color-danger);
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
</style>
