/*
 * @Author: Chuang
 * @Date: 2023-01-05 09:44:50
 * @LastEditTime: 2025-12-15 21:11:59
 * @LastEditors: Chuang
 * @Description: 路由守卫（未登录拦截）
 */
import type { RouteLocationNormalized } from 'vue-router'
import { UIConfig } from '@/core/config'
import router from '@/router'
import { DEFAULT_HOME_PATH, isDefaultHomeRedirect, LOGIN_PATH } from '@/router/navigation'

import { useAccountStore } from '@/stores/modules/account'
import { useMenuStore } from '@/stores/modules/menu'
import { CacheKeyNameEnum, storageUtil } from '@/utils/cache'
import { NPDone, NPStart } from '@/utils/nprogress'

function getLoginLocation(fullPath: string) {
  if (isDefaultHomeRedirect(fullPath))
    return { path: LOGIN_PATH }

  return { path: LOGIN_PATH, query: { redirect: fullPath } }
}

function landingPath(url: string) {
  const q = url.indexOf('?')
  const h = url.indexOf('#')
  let end = url.length
  if (q >= 0)
    end = Math.min(end, q)
  if (h >= 0)
    end = Math.min(end, h)
  return url.slice(0, end)
}

function redirectIfShell(to: RouteLocationNormalized, menuStore: ReturnType<typeof useMenuStore>) {
  const landing = menuStore.resolveLandingUrl(to)
  if (!landing)
    return undefined
  const path = landingPath(landing)
  if (!path || path === to.path)
    return undefined
  return { path, replace: true }
}

async function bootstrapSession(
  accountStore: ReturnType<typeof useAccountStore>,
  menuStore: ReturnType<typeof useMenuStore>,
  to: RouteLocationNormalized,
) {
  await accountStore.fetchUserInfo()
  await menuStore.fetchUserMenus()
  menuStore.syncActiveRootFromRoute(to)
  if (!accountStore.hasUserInfo())
    throw new Error('获取用户信息失败')
}

function stayOnLogin(
  accountStore: ReturnType<typeof useAccountStore>,
  menuStore: ReturnType<typeof useMenuStore>,
) {
  accountStore.resetUserInfo()
  menuStore.clearMenus()
  return true
}

export function setupRouteGuard() {
  // 无需认证白名单
  const NO_AUTH_PATHS = ['/404', '/url-frame']
  const accountStore = useAccountStore()
  const menuStore = useMenuStore()

  router.beforeEach(async (to) => {
    NPStart()
    const { path } = to
    const accessToken = storageUtil.get(CacheKeyNameEnum.accessToken)
    if (path === LOGIN_PATH) {
      if (!accessToken)
        return true
      if (accountStore.hasUserInfo()) {
        const home = menuStore.resolveHomeUrl()
        return { path: home || DEFAULT_HOME_PATH }
      }
      try {
        await bootstrapSession(accountStore, menuStore, to)
        const home = menuStore.resolveHomeUrl()
        return { path: home || DEFAULT_HOME_PATH }
      }
      catch {
        // 后端不可用时留在登录页，避免踢回 / 再失败白屏
        return stayOnLogin(accountStore, menuStore)
      }
    }
    else if (NO_AUTH_PATHS.includes(path)) {
      return true
    }
    else {
      if (accessToken) {
        const hasUserInfo = accountStore.hasUserInfo()
        if (hasUserInfo) {
          return redirectIfShell(to, menuStore) ?? true
        }
        else {
          try {
            await bootstrapSession(accountStore, menuStore, to)
            return redirectIfShell(to, menuStore) ?? { ...to, replace: true }
          }
          catch {
            accountStore.resetUserInfo()
            menuStore.clearMenus()
            return getLoginLocation(to.fullPath)
          }
        }
      }
      else {
        return getLoginLocation(to.fullPath)
      }
    }
  })
  router.afterEach((to) => {
    enterRouteCallback(to.meta.title)
    NPDone()
  })
}

function enterRouteCallback(title: unknown) {
  let pageTitle
  if (title)
    pageTitle = `${title}-${UIConfig.appTitle}`
  else pageTitle = `${UIConfig.appTitle}`

  document.title = pageTitle
}
