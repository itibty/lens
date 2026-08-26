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
      if (accessToken) {
        if (accountStore.hasUserInfo()) {
          const home = menuStore.resolveHomeUrl()
          return { path: home || DEFAULT_HOME_PATH }
        }
        return { path: '/' }
      }

      return true
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
            await accountStore.fetchUserInfo() // 获取用户信息
            await menuStore.fetchUserMenus() // 获取用户菜单
            menuStore.syncActiveRootFromRoute(to)
            await menuStore.ensureReportTree()
            if (!accountStore.hasUserInfo()) {
              throw new Error('获取用户信息失败')
            }
            return redirectIfShell(to, menuStore) ?? { ...to, replace: true }
          }
          catch {
            await accountStore.clearUserInfo()
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
