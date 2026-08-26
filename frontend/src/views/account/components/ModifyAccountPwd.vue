<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { modifyAccountPwd } from '@/apis/admin/account'
import { useAccountStore } from '@/stores/modules/account'
import { showToast } from '@/utils/index'
import { isPassword } from '@/utils/validate'

interface ModifyForm {
  password: string
  newPassword: string
  checkNewPassword: string
}
interface IStates {
  loading: boolean
  form: ModifyForm
}

const states = reactive<IStates>({
  loading: false,
  form: {
    password: '',
    newPassword: '',
    checkNewPassword: '',
  },
})

const formRef = ref<FormInstance>()
function validateNewPass(rule: any, value: string | null, callback: Function) {
  if (value === '') {
    callback(new Error('请输入新密码'))
  }
  else if (!isPassword(value!)) {
    callback(new Error('新密码必须是8-20位数字、字母或下划线'))
  }
  else {
    if (states.form.checkNewPassword !== '')
      formRef.value!.validateField('checkNewPassword')

    callback()
  }
}
function validateCheckNewPass(rule: any, value: string | null, callback: Function) {
  if (value === '')
    callback(new Error('请再次输入新密码'))
  else if (value !== states.form.newPassword)
    callback(new Error('两次输入新密码不一致!'))
  else
    callback()
}
const rules = reactive<FormRules<ModifyForm>>({
  password: [{ required: true, trigger: 'blur', message: '请输入原密码' }],
  newPassword: [
    { required: true, validator: validateNewPass, trigger: 'blur' },
  ],
  checkNewPassword: [
    { required: true, validator: validateCheckNewPass, trigger: 'blur' },
  ],
})
const router = useRouter()
let logoutTimer: ReturnType<typeof setTimeout> | undefined
let isUnmounted = false

function clearLogoutTimer() {
  if (!logoutTimer)
    return

  clearTimeout(logoutTimer)
  logoutTimer = undefined
}

function handleSubmit() {
  formRef.value!.validate(async (valid) => {
    if (valid) {
      const param = {
        oldPassword: states.form.password,
        newPassword: states.form.newPassword,
      }
      states.loading = true
      const accountStore = useAccountStore()
      try {
        const res = await modifyAccountPwd(param)
        if (res.code === 200) {
          showToast(res.msg)
          clearLogoutTimer()
          logoutTimer = setTimeout(async () => {
            logoutTimer = undefined
            await accountStore.logout()
            if (isUnmounted)
              return

            router.push({
              path: '/login',
            })
          }, 1000)
        }
      }
      finally {
        states.loading = false
      }
    }
  })
}

onUnmounted(() => {
  isUnmounted = true
  clearLogoutTimer()
})
</script>

<template>
  <el-form
    ref="formRef"
    :model="states.form"
    :rules="rules"
    label-position="top"
  >
    <el-form-item label="原密码" prop="password">
      <el-input
        v-model="states.form.password"
        type="password"
        show-password
        placeholder="请输入真实姓名"
        autocomplete="off"
      />
    </el-form-item>
    <el-form-item label="新密码" prop="newPassword">
      <el-input
        v-model="states.form.newPassword"
        type="password"
        show-password
        placeholder="请输入新密码"
        autocomplete="off"
      />
    </el-form-item>
    <el-form-item label="确认密码" prop="checkNewPassword">
      <el-input
        v-model="states.form.checkNewPassword"
        type="password"
        show-password
        placeholder="请再次输入密码"
        autocomplete="off"
      />
    </el-form-item>
    <el-form-item class="mt-30px">
      <el-button
        v-spinner="states.loading"
        type="primary"
        @click="handleSubmit"
      >
        确认修改
      </el-button>
    </el-form-item>
  </el-form>
</template>

<style lang="scss" scoped></style>
