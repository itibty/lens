<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { CustomDialogProps } from '@/components/CustomDialog.vue'
import { editMenu } from '@/apis/admin/menu'
import CustomDialog from '@/components/CustomDialog.vue'
import { normalizeMenuIconName } from '@/core/menuIcons'
import { showToast } from '@/utils/index'
import { type MenuType, isFunc } from '../menuAdmin'
import MenuIconPicker from './MenuIconPicker.vue'

export type { MenuType }

export interface EditMenuDialogInstance {
  showAdd: (options: { pid?: string, menuType?: MenuType }) => void
  showEdit: (row: ADMIN.MenuTree) => void
}

interface IStates {
  form: ADMIN.SaveMenuRequest
  rules: FormRules<ADMIN.SaveMenuRequest>
}

const emits = defineEmits<{
  (e: 'saved', id?: string): void
}>()

const defaultForm: ADMIN.SaveMenuRequest = {
  id: undefined,
  pid: '0',
  menuName: '',
  menuType: 'MENU',
  routePath: '',
  icon: '',
  permCode: '',
  sortNum: 0,
  status: 'EBL',
}

const states = reactive<IStates>({
  form: { ...defaultForm },
  rules: {
    menuName: [{ required: true, trigger: 'blur', message: '请输入名称' }],
  },
})

const formRef = ref<FormInstance>()
const dialog = reactive<CustomDialogProps>({
  visible: false,
  size: 'mini',
  title: '新增',
  appendToBody: true,
  confirmLoading: false,
  cancelText: '取消',
  confirmText: '保存',
  handlerCancel: () => {
    dialog.visible = false
  },
  handlerConfirm: () => {
    doSubmit()
  },
})

const menuType = computed(() => (states.form.menuType || 'MENU') as MenuType)
const showIconField = computed(() => !isFunc({ menuType: menuType.value }))
const showRouteField = computed(() => !isFunc({ menuType: menuType.value }))

function resetForm(partial: Partial<ADMIN.SaveMenuRequest>) {
  states.form = {
    ...defaultForm,
    ...partial,
    icon: normalizeMenuIconName(partial.icon),
  }
}

function showAdd(options: { pid?: string, menuType?: MenuType }) {
  const addingFunc = options.menuType === 'FUNC'
  const isRoot = !options.pid || options.pid === '0'
  dialog.title = addingFunc ? '新增功能点' : (isRoot ? '新增' : '新增子菜单')
  resetForm({
    pid: options.pid ?? '0',
    menuType: addingFunc ? 'FUNC' : 'MENU',
  })
  dialog.visible = true
}

function showEdit(row: ADMIN.MenuTree) {
  const type = (row.menuType || 'MENU') as MenuType
  dialog.title = isFunc(row) ? '编辑功能点' : '编辑'
  resetForm({
    id: row.id,
    pid: row.pid ?? '0',
    menuName: row.menuName ?? '',
    menuType: type,
    routePath: row.routePath ?? '',
    icon: row.icon,
    permCode: row.permCode ?? '',
    sortNum: row.sortNum ?? 0,
    status: row.status || 'EBL',
  })
  dialog.visible = true
}

function handleClose() {
  formRef.value?.clearValidate()
}

function doSubmit() {
  formRef.value?.validate(async (valid) => {
    if (!valid)
      return
    dialog.confirmLoading = true
    try {
      const res = await editMenu({
        ...states.form,
        menuType: isFunc({ menuType: menuType.value }) ? 'FUNC' : 'MENU',
        icon: showIconField.value ? normalizeMenuIconName(states.form.icon) : '',
      })
      showToast('保存成功')
      emits('saved', res.data != null ? String(res.data) : states.form.id)
      dialog.visible = false
    }
    finally {
      dialog.confirmLoading = false
    }
  })
}

defineExpose({
  showAdd,
  showEdit,
})
</script>

<template>
  <CustomDialog
    v-bind="{ ...dialog }"
    v-model.visible="dialog.visible"
    @closed="handleClose"
  >
    <template #custom-dialog-body>
      <el-form
        ref="formRef"
        :model="states.form"
        :rules="states.rules"
        label-width="80px"
      >
        <el-form-item label="名称" prop="menuName">
          <el-input
            v-model.trim="states.form.menuName"
            maxlength="50"
            clearable
            placeholder="请输入名称"
          />
        </el-form-item>
        <el-form-item v-if="showIconField" label="图标" prop="icon">
          <MenuIconPicker v-model="states.form.icon" />
        </el-form-item>
        <el-form-item v-if="showRouteField" label="路由" prop="routePath">
          <el-input
            v-model.trim="states.form.routePath"
            maxlength="100"
            clearable
            placeholder="选填，如 /sys/users"
          />
        </el-form-item>
        <el-form-item label="权限码" prop="permCode">
          <el-input
            v-model.trim="states.form.permCode"
            maxlength="100"
            clearable
            placeholder="如 sys:user:query"
          />
        </el-form-item>
        <el-form-item label="排序" prop="sortNum">
          <el-input-number v-model="states.form.sortNum" :min="0" :max="9999" />
        </el-form-item>
      </el-form>
    </template>
  </CustomDialog>
</template>
