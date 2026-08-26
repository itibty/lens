import type { Router } from 'vue-router'

export const LOGIN_PATH = '/login'
/** 默认首页；`/` 会 redirect 到该路径 */
export const DEFAULT_HOME_PATH = '/index'

let appRouter: Router | undefined
let loginRedirectTask: Promise<unknown> | undefined

interface LoginRedirectOptions {
  beforeRedirect?: () => void
}

export function setupNavigation(router: Router): void {
  appRouter = router
}

export function getCurrentRouteInfo() {
  return appRouter?.currentRoute.value
}

/** 默认首页（`/` 或 `/index`）无需带回登录后 redirect */
export function isDefaultHomeRedirect(path: string): boolean {
  return path === '/' || path === DEFAULT_HOME_PATH
}

export function replaceToLogin(redirect?: string): Promise<unknown> {
  if (!appRouter)
    return Promise.resolve()

  const shouldRedirect = redirect && !isDefaultHomeRedirect(redirect)

  return appRouter.replace({
    path: LOGIN_PATH,
    query: shouldRedirect ? { redirect } : undefined,
  })
}

export function replaceToLoginFromCurrentRoute(options: LoginRedirectOptions = {}): Promise<unknown> {
  if (loginRedirectTask)
    return loginRedirectTask

  options.beforeRedirect?.()
  loginRedirectTask = replaceToLogin(getCurrentRouteRedirect()).finally(() => {
    loginRedirectTask = undefined
  })

  return loginRedirectTask
}

function getCurrentRouteRedirect(): string | undefined {
  const currentRoute = getCurrentRouteInfo()

  if (!currentRoute || currentRoute.path === LOGIN_PATH)
    return undefined

  if (isDefaultHomeRedirect(currentRoute.fullPath))
    return undefined

  return currentRoute.fullPath
}
