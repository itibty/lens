<!--
 * @Author: Chuang
 * @Date: 2023-09-04 16:52:16
 * @LastEditTime: 2024-05-17 14:57:49
 * @LastEditors: Chuang
 * @Description: 新增角色弹窗
-->
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { CustomDialogProps } from '@/components/CustomDialog.vue'
import { pickBy } from 'lodash-es'
import { addRole } from '@/apis/admin/role'
import CustomDialog from '@/components/CustomDialog.vue'
import { showToast } from '@/utils/index'
import { isBlank } from '@/utils/validate'

export interface AddRoleDialogInstance {
  showDialog: () => void
}

interface IStates {
  form: ADMIN.SaveRoleRequest
  rules: FormRules<ADMIN.SaveRoleRequest>
}

const emits = defineEmits<{
  (e: 'fetchData'): void
}>()
const defaultForm: ADMIN.SaveRoleRequest = {
  roleName: '',
  roleCode: '',
  roleNote: '',
  status: 'EBL',
}
const states = reactive<IStates>({
  form: { ...defaultForm },
  rules: {
    roleName: [{ required: true, trigger: 'blur', message: '请输入角色名称' }],
    roleCode: [
      { required: true, trigger: 'blur', message: '请输入角色编码' },
      {
        pattern: /^\w*$/,
        trigger: 'blur',
        message: '角色编码只能包含字母、数字、下划线',
      },
    ],
  },
})

const formRef = ref<FormInstance>()
const dialog = reactive<CustomDialogProps>({
  visible: false,
  size: 'mini',
  title: '新增角色',
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

function handleOpen() {
  states.form = { ...defaultForm }
  formRef.value?.clearValidate()
}
function handleClose() {}

function showDialog() {
  dialog.visible = true
}

function doSubmit() {
  formRef.value?.validate(async (valid) => {
    if (valid) {
      const body: unknown = pickBy(
        states.form,
        value => typeof value != 'string' || !isBlank(value),
      )
      dialog.confirmLoading = true
      addRole(body as ADMIN.SaveRoleRequest)
        .then((res) => {
          const { msg } = res
          showToast(msg, 'success')
          emits('fetchData')
          dialog.visible = false
        })
        .finally(() => {
          dialog.confirmLoading = false
        })
    }
  })
}

defineExpose({
  showDialog,
})
</script>

<template>
  <CustomDialog
    v-bind="{ ...dialog }"
    v-model.visible="dialog.visible"
    @opened="handleOpen"
    @closed="handleClose"
  >
    <template #custom-dialog-body>
      <el-form
        ref="formRef"
        :model="states.form"
        :rules="states.rules"
        label-width="80px"
      >
        <el-form-item label="角色编码" prop="roleCode">
          <el-input
            v-model.trim="states.form.roleCode"
            maxlength="50"
            clearable
            placeholder="请输入角色编码"
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="角色名称" prop="roleName">
          <el-input
            v-model.trim="states.form.roleName"
            maxlength="50"
            clearable
            placeholder="请输入角色名称"
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="说明" prop="roleNote">
          <el-input
            v-model.trim="states.form.roleNote"
            type="textarea"
            :rows="3"
            maxlength="100"
            clearable
            placeholder="请输入说明"
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-switch
            v-model="states.form.status"
            inline-prompt
            active-text="启用"
            inactive-text="禁用"
            active-value="EBL"
            inactive-value="DBL"
          />
        </el-form-item>
      </el-form>
    </template>
  </CustomDialog>
</template>

<style lang="scss" scoped>
</style>
