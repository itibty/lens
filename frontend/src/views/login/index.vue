<!--
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2026-03-20 11:31:22
 * @LastEditors: Chuang
 * @Description: 登录页
-->
<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import { isDefaultHomeRedirect } from '@/router/navigation'
import { useAccountStore } from '@/stores/modules/account'
import { CacheKeyNameEnum, storageUtil } from '@/utils/cache'
import { createLogger } from '@/utils/logger'
import { isBlank } from '@/utils/validate'

const logger = createLogger('LOGIN')

// data
const states = reactive({
  loading: false,
  form: {
    username: '',
    password: '',
    remember: false,
  },
})
const formRef = ref<FormInstance>()
const rules = {
  username: [{ required: true, trigger: 'blur', message: '用户名不能为空' }],
  password: [{ required: true, trigger: 'blur', message: '密码不能为空' }],
}
const accountStore = useAccountStore()
const router = useRouter()
const route = useRoute()

function initLoginForm() {
  const username = storageUtil.get(CacheKeyNameEnum.username)
  const usernameExist = !isBlank(username)
  if (usernameExist) {
    states.form.username = username!
    states.form.remember = true
  }
  // 清理遗留的密码存储（历史版本可能存储过明文密码）
  storageUtil.del(CacheKeyNameEnum.password)
}
async function handleLogin() {
  formRef.value?.validate(async (valid) => {
    if (!valid)
      return

    if (states.form.remember) {
      storageUtil.set(CacheKeyNameEnum.username, states.form.username)
    }
    else {
      storageUtil.del(CacheKeyNameEnum.username)
    }

    states.loading = true
    try {
      await accountStore.login({
        username: states.form.username,
        password: states.form.password,
      })
      router.replace(getLoginRedirect())
    }
    catch (error) {
      logger.error(error)
    }
    finally {
      states.loading = false
    }
  })
}
function handleForgetPwd() {}
function getLoginRedirect() {
  const redirect = route.query.redirect
  if (typeof redirect !== 'string')
    return '/'

  if (!redirect.startsWith('/') || redirect.startsWith('//') || redirect.startsWith('/\\'))
    return '/'

  try {
    const redirectUrl = new URL(redirect, window.location.origin)
    if (redirectUrl.origin === window.location.origin) {
      const target = `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
      return isDefaultHomeRedirect(target) ? '/' : target
    }
  }
  catch (error) {
    logger.error(error)
  }

  return '/'
}
onMounted(() => {
  initLoginForm()
})
</script>

<template>
  <div class="page flex-xy">
    <div class="base-hover-shadow login-container">
      <div class="pic-wrapper">
        <div class="brand-header">
          <img class="brand-logo" src="@/assets/icons/logo.svg" alt="logo">
          <span>Lens</span>
        </div>
        <img class="pic" src="@/assets/images/login/welcome.png" alt="pic">
      </div>
      <div class="form-wrapper">
        <div class="title">
          登录
        </div>
        <div class="title-tips">
          欢迎使用 Lens
        </div>
        <el-form
          ref="formRef"
          :model="states.form"
          :rules="rules"
          class="login-form"
          size="large"
        >
          <el-form-item prop="username">
            <el-input v-model.trim="states.form.username" placeholder="用户名">
              <template #prefix>
                <el-icon class="text-18px">
                  <i-mingcute-user-2-fill />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item
            style="margin-top: 30px"
            prop="password"
          >
            <el-input
              v-model.trim="states.form.password"
              placeholder="密码"
              show-password
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon class="text-18px">
                  <i-mingcute-lock-fill />
                </el-icon>
              </template>
            </el-input>
          </el-form-item>
          <div class="remember-wrapper">
            <el-checkbox v-model="states.form.remember">
              记住账号
            </el-checkbox>
            <el-button type="primary" link @click="handleForgetPwd">
              忘记密码?
            </el-button>
          </div>
          <el-button
            :loading="states.loading"
            class="login-btn"
            type="primary"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page {
  width: 100vw;
  height: 100vh;

  background-color: var(--el-bg-color-page);
  background-image: url(@/assets/images/login/background.svg);
  background-repeat: no-repeat;
  background-position: center 110px;
  background-size: 100%;
}

$leftImgBg: #e0edff;
$introTxtColor: #000b6b;

.login-container {
  display: flex;
  align-items: center;
  width: 960px;
  height: 540px;
  background-color: $leftImgBg;

  .pic-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 506px;
    height: 100%;

    .brand-header {
      position: absolute;
      top: 32px;
      left: 34px;
      display: flex;
      align-items: center;
      color: $introTxtColor;
      font-weight: 700;
      font-size: 17px;
      line-height: 1;

      .brand-logo {
        width: 24px;
        height: 24px;
        margin-right: 10px;
      }
    }

    .pic {
      width: 504px;
      height: 309px;
    }
  }
  .form-wrapper {
    box-sizing: border-box;
    width: 454px;
    height: 100%;
    padding: 0 48px 0 30px;
    background-color: var(--el-bg-color);

    .login-form {
      margin-top: 57px;

      .remember-wrapper {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 15px;
        font-size: 13px;
        line-height: 1;
      }

      .login-btn {
        width: 377px;
        height: 40px;
        margin-top: 30px;
      }
    }

    .title {
      margin-top: 67px;
      color: $introTxtColor;
      font-weight: 550;
      font-size: 28px;
      line-height: 1;
    }
    .title-tips {
      margin-top: 10px;
      color: $introTxtColor;
      font-weight: 530;
      font-size: 13px;
      line-height: 1;
    }
  }
}
</style>
