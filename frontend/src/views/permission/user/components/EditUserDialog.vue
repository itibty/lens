<!--
 * @Author: Chuang
 * @Date: 2023-09-04 16:52:16
 * @LastEditTime: 2025-03-08 00:32:06
 * @LastEditors: Chuang
 * @Description: 编辑账号弹窗
-->
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { CustomDialogProps } from '@/components/CustomDialog.vue'
import { pick, pickBy } from 'lodash-es'
import { editUser } from '@/apis/admin/user'
import CustomDialog from '@/components/CustomDialog.vue'
import { UIConfig } from '@/core/config'
import { invalidImg } from '@/core/data'
import { showToast } from '@/utils/index'
import { isBlank } from '@/utils/validate'

export interface EditUserDialogInstance {
  showDialog: (row: ADMIN.UserInfo) => void
}

interface IStates {
  form: ADMIN.SaveUserRequest
  rules: FormRules<ADMIN.SaveUserRequest>
}

const emits = defineEmits<{
  (e: 'fetchData'): void
}>()
const defaultForm: ADMIN.SaveUserRequest = {
  id: '',
  username: '',
  realName: '',
  avatar: '',
  status: 'EBL',
}
const states = reactive<IStates>({
  form: { ...defaultForm },
  rules: {
    realName: [{ required: true, trigger: 'blur', message: '请输入姓名' }],
  },
})

const formRef = ref<FormInstance>()
const dialog = reactive<CustomDialogProps>({
  visible: false,
  size: 'mini',
  title: '编辑用户',
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

function handleOpen() {}
function handleClose() {
  formRef.value?.clearValidate()
}

function showDialog(row: ADMIN.UserInfo) {
  states.form = pick(row, Object.keys(states.form)) as ADMIN.SaveUserRequest
  states.form.username = row.username || ''
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
      editUser(body as ADMIN.SaveUserRequest)
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
        <el-form-item label="姓名" prop="realName">
          <el-input
            v-model.trim="states.form.realName"
            maxlength="20"
            clearable
            placeholder="请输入真实姓名"
            autocomplete="off"
          />
        </el-form-item>
        <el-form-item label="头像" prop="avatar">
          <el-avatar
            :key="`${UIConfig.publicOssHost}${states.form.avatar}`"
            :size="100"
            :src="`${UIConfig.publicOssHost}${states.form.avatar}`"
          >
            <img :src="invalidImg">
          </el-avatar>
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

<style lang="scss" scoped></style>
