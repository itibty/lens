<!--
 * @Author: Chuang
 * @Date: 2023-09-04 16:52:16
 * @LastEditTime: 2024-05-27 18:39:05
 * @LastEditors: Chuang
 * @Description: 新增账号弹窗
-->
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { CustomDialogProps } from '@/components/CustomDialog.vue'
import { pickBy } from 'lodash-es'
import { addUser } from '@/apis/admin/user'
import CustomDialog from '@/components/CustomDialog.vue'
import { showToast } from '@/utils/index'
import { isBlank } from '@/utils/validate'

export interface AddUserDialogInstance {
  showDialog: () => void
}

interface IStates {
  form: ADMIN.SaveUserRequest
  rules: FormRules<ADMIN.SaveUserRequest>
}

const emits = defineEmits<{
  (e: 'fetchData'): void
}>()
const defaultForm: ADMIN.SaveUserRequest = {
  username: '',
  realName: '',
  password: 'Aa123456',
  status: 'EBL',
}
const states = reactive<IStates>({
  form: { ...defaultForm },
  rules: {
    username: [
      { required: true, trigger: 'blur', message: '请输入用户名' },
      {
        pattern: /^\w*$/,
        trigger: 'blur',
        message: '用户名只能包含字母、数字、下划线',
      },
    ],
    realName: [{ required: true, trigger: 'blur', message: '请输入姓名' }],
    password: [{ required: true, trigger: 'blur', message: '请输入密码' }],
  },
})

const formRef = ref<FormInstance>()
const dialog = reactive<CustomDialogProps>({
  visible: false,
  size: 'mini',
  title: '新增用户',
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
      addUser(body as ADMIN.SaveUserRequest)
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
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model.trim="states.form.username"
            maxlength="50"
            clearable
            placeholder="请输入用户名"
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input
            v-model.trim="states.form.realName"
            maxlength="20"
            clearable
            placeholder="请输入真实姓名"
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model.trim="states.form.password"
            type="password"
            maxlength="50"
            show-password
            clearable
            placeholder="默认 Aa123456"
            autocomplete="new-password"
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
