/*
 * @Author: Chuang
 * @Date: 2025-07-28 14:18:47
 * @LastEditTime: 2026-05-20 22:00:49
 * @LastEditors: Chuang
 * @Description: 布局相关hooks
 */
import type { RouteLocationNormalized } from 'vue-router'
import { onBeforeRouteLeave } from 'vue-router'
import router, { getRouteScrollKey } from '@/router'
import { useKeepPageStore } from '@/stores/modules/keepPage'
import { createLogger } from '@/utils/logger'

const logger = createLogger('LAYOUT_HOOK')

function routeNameKeys(route: RouteLocationNormalized): string[] {
  const keys = new Set<string>()
  const componentName = route.meta?.componentName
  if (typeof componentName === 'string' && componentName)
    keys.add(componentName)
  if (typeof route.name === 'string' && route.name)
    keys.add(route.name)
  return [...keys]
}

function routeComponentName(route?: RouteLocationNormalized): string {
  const current = route ?? router.currentRoute.value
  return routeNameKeys(current)[0] || ''
}

/**
 * 列表页：进入 targetPages 时缓存本页，并记下「子页 → 本列表」。
 * 传入 reload（一般是 fetchData）时，子页 markListStale 后返回会重查。
 */
export function useKeepAlive(targetPages: string[] | 'all', reload?: () => void) {
  const keepPageStore = useKeepPageStore()
  const listName = routeComponentName()
  const TAG = 'KeepAlive'
  logger.debug(TAG, targetPages)
  const setKeepPage = (to: RouteLocationNormalized, fromName: string, fromScrollKey: string) => {
    const toKeys = routeNameKeys(to)
    const scrollTop = keepPageStore.hasScrollTop(fromScrollKey)
      ? keepPageStore.getScrollTop(fromScrollKey)
      : window.scrollY
    const hit = targetPages === 'all' || toKeys.some(key => targetPages.includes(key))
    if (!hit) {
      logger.debug(TAG, `del: ${fromName}`)
      keepPageStore.removePage(fromName, fromScrollKey)
      return
    }
    logger.debug(TAG, `add: ${fromName}`)
    for (const key of toKeys)
      keepPageStore.rememberReturnList(key, fromName)
    keepPageStore.addPage(fromName, fromScrollKey, scrollTop)
  }

  onBeforeRouteLeave((to, from) => {
    const fromName = routeComponentName(from)
    const fromScrollKey = getRouteScrollKey(from)
    logger.debug(TAG, `to:${routeComponentName(to)}, from: ${fromName}`)
    setKeepPage(to, fromName, fromScrollKey)
  })

  if (reload) {
    onActivated(() => {
      if (keepPageStore.consumeStale(listName))
        reload()
    })
  }
}

/** 子页写成功后调用。能确定列表页名就传入，避免只靠子页反查。 */
export function markListStale(listName?: string) {
  const store = useKeepPageStore()
  if (listName) {
    store.markPageStale(listName)
  }
  else {
    for (const key of routeNameKeys(router.currentRoute.value))
      store.markReturnListStale(key)
  }
}
