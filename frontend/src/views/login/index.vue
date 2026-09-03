<!--
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2026-09-03
 * @LastEditors: Codex
 * @Description: 登录页
-->
<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import LensLogo from '@/components/LensLogo.vue'
import { isDefaultHomeRedirect } from '@/router/navigation'
import { useAccountStore } from '@/stores/modules/account'
import { showToast } from '@/utils'
import { CacheKeyNameEnum, storageUtil } from '@/utils/cache'
import { createLogger } from '@/utils/logger'
import { isBlank } from '@/utils/validate'

const SLOGANS = [
  '让数据更清晰',
  '看见数据价值',
  '聚焦数据洞见',
  '数据驱动决策',
] as const

const logger = createLogger('LOGIN')
const accountStore = useAccountStore()
const router = useRouter()
const route = useRoute()
const formRef = ref<FormInstance>()
const slogan = SLOGANS[Math.floor(Math.random() * SLOGANS.length)] ?? SLOGANS[0]

const states = reactive({
  loading: false,
  form: {
    username: '',
    password: '',
    remember: false,
  },
})

const rules = {
  username: [{ required: true, trigger: 'blur', message: '用户名不能为空' }],
  password: [{ required: true, trigger: 'blur', message: '密码不能为空' }],
}

function initLoginForm() {
  const username = storageUtil.get(CacheKeyNameEnum.username)
  if (!isBlank(username)) {
    states.form.username = username!
    states.form.remember = true
  }

  // 清理历史版本可能遗留的明文密码。
  storageUtil.del(CacheKeyNameEnum.password)
}

async function handleLogin() {
  formRef.value?.validate(async (valid) => {
    if (!valid)
      return

    if (states.form.remember)
      storageUtil.set(CacheKeyNameEnum.username, states.form.username)
    else
      storageUtil.del(CacheKeyNameEnum.username)

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

function handleForgetPwd() {
  showToast('请联系管理员重置密码', 'info')
}

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

onMounted(initLoginForm)
</script>

<template>
  <main class="login-page">
    <section class="brand-panel" aria-label="Lens 品牌区域">
      <div class="brand-lockup">
        <LensLogo class="brand-logo" surface="light" />
        <span>Lens</span>
      </div>

      <div class="brand-orbit" aria-hidden="true">
        <span class="brand-orbit__dot" />
      </div>

      <div class="slogan-block">
        <span class="slogan-focus" aria-hidden="true" />
        <h1>{{ slogan }}</h1>
      </div>
    </section>

    <section class="auth-panel" aria-labelledby="login-title">
      <el-form
        ref="formRef"
        :model="states.form"
        :rules="rules"
        class="login-form"
        label-position="top"
        size="large"
        @submit.prevent="handleLogin"
      >
        <h2 id="login-title" class="auth-title">
          登录
        </h2>
        <p class="auth-caption">
          使用你的 Lens 账号继续
        </p>

        <el-form-item class="field-item" label="账号" prop="username">
          <el-input
            v-model.trim="states.form.username"
            autocomplete="username"
            name="username"
            placeholder="请输入账号"
          />
        </el-form-item>

        <el-form-item class="field-item" label="密码" prop="password">
          <el-input
            v-model.trim="states.form.password"
            autocomplete="current-password"
            name="password"
            placeholder="请输入密码"
            show-password
            type="password"
          />
        </el-form-item>

        <div class="form-meta">
          <el-checkbox v-model="states.form.remember">
            保持登录
          </el-checkbox>
          <button class="forgot-button" type="button" @click="handleForgetPwd">
            忘记密码？
          </button>
        </div>

        <el-button
          :loading="states.loading"
          class="login-button"
          native-type="submit"
        >
          <span>进入 Lens</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 12h13M14 7l5 5-5 5"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </el-button>
      </el-form>

      <span class="corner-index" aria-hidden="true">LENS / 01</span>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.login-page {
  --login-ink: #1d211e;
  --login-muted: #747a74;
  --login-accent: #4f8c7d;

  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(420px, 0.82fr);
  width: 100%;
  min-width: 320px;
  min-height: max(680px, 100vh);
  overflow: hidden;
  background: #f1eee6;
  color: var(--login-ink);
}

.brand-panel {
  position: relative;
  isolation: isolate;
  display: flex;
  min-width: 0;
  align-items: flex-end;
  overflow: hidden;
  padding: clamp(112px, 14vh, 154px) clamp(48px, 6vw, 92px) clamp(58px, 8vh, 86px);
  background:
    radial-gradient(circle at 76% 28%, rgb(55 121 107 / 9%) 0%, transparent 27%),
    radial-gradient(circle at 84% 76%, rgb(104 91 141 / 6%) 0%, transparent 25%),
    linear-gradient(135deg, #f3f1eb 0%, #e9ece8 100%);
}

.brand-panel::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background:
    linear-gradient(rgb(29 37 32 / 5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(29 37 32 / 5%) 1px, transparent 1px);
  background-size: 72px 72px;
  content: '';
  opacity: 0.62;
  mask-image: linear-gradient(125deg, transparent 8%, #000 54%, transparent 92%);
  pointer-events: none;
}

.brand-panel::after {
  position: absolute;
  top: 9%;
  right: -235px;
  z-index: -1;
  width: 520px;
  height: 520px;
  border: 1px solid rgb(32 42 36 / 8%);
  border-radius: 50%;
  box-shadow:
    0 0 0 78px rgb(32 42 36 / 2.4%),
    0 0 0 156px rgb(32 42 36 / 1.8%);
  content: '';
  pointer-events: none;
}

.brand-lockup {
  position: absolute;
  top: 42px;
  left: clamp(48px, 6vw, 92px);
  display: flex;
  align-items: center;
  gap: 11px;
  color: var(--login-ink);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1;
}

.brand-logo {
  width: 34px;
  height: 34px;
}

.brand-orbit {
  position: absolute;
  top: 46%;
  left: 67%;
  z-index: -1;
  width: min(41vw, 520px);
  aspect-ratio: 1 / 1.08;
  border: 1px solid rgb(32 38 34 / 13%);
  border-radius: 50%;
  transform: translate(-50%, -50%) rotate(-17deg);
}

.brand-orbit::before,
.brand-orbit::after {
  position: absolute;
  border: 1px solid rgb(32 38 34 / 10%);
  border-radius: 50%;
  content: '';
}

.brand-orbit::before {
  inset: 15% -11%;
  transform: rotate(32deg);
}

.brand-orbit::after {
  inset: 38%;
  background: rgb(62 125 111 / 4%);
}

.brand-orbit__dot {
  position: absolute;
  top: 17%;
  right: 8.5%;
  width: 10px;
  height: 10px;
  border: 2px solid #ebede8;
  border-radius: 50%;
  background: var(--login-accent);
  box-shadow: 0 0 0 7px rgb(79 140 125 / 11%);
}

.slogan-block {
  position: relative;
  width: min(720px, 100%);
}

.slogan-focus {
  display: block;
  width: 9px;
  height: 9px;
  margin-bottom: 26px;
  border-radius: 50%;
  background: var(--login-accent);
}

.slogan-block h1 {
  margin: 0;
  color: var(--login-ink);
  font-size: clamp(36px, 4vw, 50px);
  font-weight: 500;
  letter-spacing: -0.055em;
  line-height: 1.16;
}

.slogan-block h1::after {
  display: block;
  width: clamp(58px, 6vw, 86px);
  height: 1px;
  margin-top: 23px;
  background: currentColor;
  content: '';
  opacity: 0.18;
}

.auth-panel {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  padding: 68px clamp(40px, 5vw, 76px);
  background: #f8f6f0;
}

.auth-panel::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  background: rgb(28 31 29 / 8%);
  content: '';
}

.login-form {
  width: min(360px, 100%);
}

.auth-title {
  margin: 0 0 12px;
  color: #1b1e1c;
  font-size: 32px;
  font-weight: 500;
  letter-spacing: -0.04em;
  line-height: 1.2;
}

.auth-caption {
  margin: 0 0 40px;
  color: #858981;
  font-size: 14px;
  line-height: 1.6;
}

.field-item {
  margin-bottom: 24px;
}

.field-item :deep(.el-form-item__label) {
  height: auto;
  margin-bottom: 8px;
  padding: 0;
  color: #555b55;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.field-item :deep(.el-input__wrapper) {
  min-height: 50px;
  padding: 0 34px 0 0;
  border-radius: 0;
  background: transparent;
  box-shadow: 0 1px 0 #c9c9c1;
  transition: box-shadow 160ms ease;
}

.field-item :deep(.el-input__wrapper:hover) {
  box-shadow: 0 1px 0 #9da19a;
}

.field-item :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 2px 0 var(--login-accent);
}

.field-item :deep(.el-input__inner) {
  height: 50px;
  color: #1d201e;
  font-size: 15px;
}

.field-item :deep(.el-input__inner::placeholder) {
  color: #aaa9a1;
}

.field-item :deep(.el-input__password) {
  color: #858b84;
  font-size: 18px;
}

.field-item :deep(.el-form-item__error) {
  padding-top: 6px;
}

.form-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 27px 0 32px;
}

.form-meta :deep(.el-checkbox) {
  --el-checkbox-checked-bg-color: #252927;
  --el-checkbox-checked-input-border-color: #252927;
  --el-checkbox-input-border-color-hover: #5f665f;

  height: auto;
  color: #70756f;
}

.form-meta :deep(.el-checkbox__label) {
  padding-left: 9px;
  color: inherit;
  font-size: 13px;
}

.forgot-button {
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: #626862;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: color 150ms ease;
}

.forgot-button:hover {
  color: var(--login-accent);
}

.forgot-button:focus-visible {
  border-radius: 2px;
  outline: 2px solid rgb(79 140 125 / 32%);
  outline-offset: 4px;
}

.login-button {
  width: 100%;
  height: 56px;
  padding: 0 21px;
  border: 1px solid #202320;
  border-radius: 4px;
  background: #202320;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  box-shadow: 0 12px 26px rgb(25 28 25 / 16%);
  transition:
    background 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease,
    transform 150ms ease;
}

.login-button:hover,
.login-button:focus {
  border-color: #090b09;
  background: #090b09;
  color: #fff;
  box-shadow: 0 16px 34px rgb(25 28 25 / 22%);
  transform: translateY(-1px);
}

.login-button :deep(> span) {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.login-button svg {
  width: 19px;
  height: 19px;
}

.corner-index {
  position: absolute;
  right: 34px;
  bottom: 28px;
  color: rgb(17 24 39 / 28%);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.16em;
}

@media (max-width: 980px) {
  .login-page {
    grid-template-columns: minmax(0, 1.2fr) minmax(390px, 0.88fr);
  }

  .brand-panel {
    padding-right: 46px;
    padding-left: 46px;
  }

  .brand-lockup {
    left: 46px;
  }

  .auth-panel {
    padding-right: 38px;
    padding-left: 38px;
  }
}

@media (max-width: 760px) {
  .login-page {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(250px, 34vh) 1fr;
    min-height: max(740px, 100vh);
    overflow: auto;
  }

  .brand-panel {
    padding: 86px 28px 32px;
  }

  .brand-panel::after {
    content: none;
  }

  .brand-lockup {
    top: 24px;
    left: 28px;
  }

  .brand-logo {
    width: 30px;
    height: 30px;
  }

  .brand-orbit {
    top: 44%;
    left: 72%;
    width: 74vw;
  }

  .slogan-focus {
    width: 8px;
    height: 8px;
    margin-bottom: 17px;
  }

  .slogan-block h1 {
    font-size: 34px;
  }

  .auth-panel {
    align-items: flex-start;
    padding: 44px 28px 68px;
  }

  .auth-panel::before {
    top: 0;
    right: 0;
    bottom: auto;
    width: auto;
    height: 1px;
  }

  .auth-caption {
    margin-bottom: 30px;
  }

  .corner-index {
    right: 24px;
    bottom: 16px;
  }
}

@media (max-width: 400px) {
  .login-page {
    grid-template-rows: 232px 1fr;
  }

  .brand-panel {
    padding-right: 22px;
    padding-left: 22px;
  }

  .brand-lockup {
    left: 22px;
  }

  .slogan-block h1 {
    font-size: 30px;
  }

  .slogan-block h1::after {
    width: 48px;
    margin-top: 17px;
  }

  .auth-panel {
    padding: 38px 22px 62px;
  }

  .auth-title {
    font-size: 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-page *,
  .login-page *::before,
  .login-page *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
