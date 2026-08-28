<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { modifyAccountPwd } from '@/apis/admin/account'
import CustomDialog from '@/components/CustomDialog.vue'
import { useAccountStore } from '@/stores/modules/account'
import { showToast } from '@/utils/index'
import { isPassword } from '@/utils/validate'

export interface ModifyAccountPwdDialogInstance {
  showDialog: () => void
}

interface ModifyForm {
  password: string
  newPassword: string
  checkNewPassword: string
}

function createForm(): ModifyForm {
  return {
    password: '',
    newPassword: '',
    checkNewPassword: '',
  }
}

const visible = ref(false)
const loading = ref(false)
const form = reactive<ModifyForm>(createForm())
const formRef = ref<FormInstance>()
const accountStore = useAccountStore()
const router = useRouter()
let logoutTimer: ReturnType<typeof setTimeout> | undefined
let isUnmounted = false

function validateNewPass(_rule: unknown, value: string, callback: (error?: Error) => void) {
  if (!value) {
    callback(new Error('请输入新密码'))
  }
  else if (!isPassword(value)) {
    callback(new Error('新密码必须是8-20位数字、字母或下划线'))
  }
  else {
    if (form.checkNewPassword)
      formRef.value?.validateField('checkNewPassword')
    callback()
  }
}

function validateCheckNewPass(_rule: unknown, value: string, callback: (error?: Error) => void) {
  if (!value)
    callback(new Error('请再次输入新密码'))
  else if (value !== form.newPassword)
    callback(new Error('两次输入的新密码不一致'))
  else
    callback()
}

const rules: FormRules<ModifyForm> = {
  password: [{ required: true, trigger: 'blur', message: '请输入原密码' }],
  newPassword: [{ required: true, validator: validateNewPass, trigger: 'blur' }],
  checkNewPassword: [{ required: true, validator: validateCheckNewPass, trigger: 'blur' }],
}

function clearLogoutTimer() {
  if (!logoutTimer)
    return
  clearTimeout(logoutTimer)
  logoutTimer = undefined
}

function resetForm() {
  Object.assign(form, createForm())
  formRef.value?.clearValidate()
}

function showDialog() {
  resetForm()
  visible.value = true
}

function closeDialog() {
  if (!loading.value)
    visible.value = false
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid)
    return

  loading.value = true
  try {
    const res = await modifyAccountPwd({
      oldPassword: form.password,
      newPassword: form.newPassword,
    })
    if (res.code !== 200)
      return

    visible.value = false
    showToast(res.msg || '密码修改成功，请重新登录')
    clearLogoutTimer()
    logoutTimer = setTimeout(async () => {
      logoutTimer = undefined
      await accountStore.logout()
      if (!isUnmounted)
        await router.push('/login')
    }, 1000)
  }
  finally {
    loading.value = false
  }
}

onUnmounted(() => {
  isUnmounted = true
  clearLogoutTimer()
})

defineExpose<ModifyAccountPwdDialogInstance>({
  showDialog,
})
</script>

<template>
  <CustomDialog
    v-model:visible="visible"
    title="修改密码"
    size="mini"
    append-to-body
    destroy-on-close
    cancel-text="取消"
    confirm-text="确认修改"
    :confirm-loading="loading"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    :show-close="!loading"
    :handler-cancel="closeDialog"
    :handler-confirm="handleSubmit"
    @closed="resetForm"
  >
    <template #custom-dialog-body>
      <el-alert
        class="password-dialog__tip"
        title="修改成功后，当前账号将退出登录"
        type="info"
        :closable="false"
      />
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent
      >
        <el-form-item label="原密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入原密码"
            autocomplete="current-password"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            show-password
            placeholder="8-20位数字、字母或下划线"
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="checkNewPassword">
          <el-input
            v-model="form.checkNewPassword"
            type="password"
            show-password
            placeholder="请再次输入新密码"
            autocomplete="new-password"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>
      </el-form>
    </template>
  </CustomDialog>
</template>

<style scoped lang="scss">
.password-dialog__tip {
  margin-bottom: 18px;
}
</style>
