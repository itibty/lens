import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router'
/*
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2026-08-25 17:59:00
 * @LastEditors: Chuang
 * @Description: 菜单
 */
import type { MenuInfo } from '@/core/data'
import type { RouteMeta } from '@/router'
import { toRaw } from 'vue'
import { listAccountMenus as fetchAccountMenus } from '@/apis/admin/account'
import { constantMenu } from '@/core/data'
import { routes } from '@/router'
import { createLogger } from '@/utils/logger'
import { isBlank } from '@/utils/validate'

const TAG = 'MENU_STORE:'
const logger = createLogger('MENU_STORE')

function buildMenuIdRouterMap(
  routeList: RouteRecordRaw[],
  record: Record<string, RouteRecordRaw>,
) {
  routeList.forEach((route: RouteRecordRaw) => {
    if (route.meta && route.meta.menuId) {
      record[route.meta.menuId as string] = route
    }
    if (route.children && route.children.length > 0) {
      buildMenuIdRouterMap(route.children, record)
    }
  })
}

function normalizePath(path: string) {
  if (!path)
    return '/'
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

function isHomePath(path: string) {
  const p = normalizePath(path)
  return p === '/' || p === '/index'
}

/** 带 menuId 且有子路由的布局壳，例如 /vis、/sys、/vis/report。叶子页不在此列。 */
function collectShellPaths(routeList: RouteRecordRaw[], acc: Set<string> = new Set()) {
  for (const route of routeList) {
    if (route.meta?.menuId && route.children?.length)
      acc.add(normalizePath(route.path))
    if (route.children?.length)
      collectShellPaths(route.children, acc)
  }
  return acc
}

function buildMenusInfo(menus: MenuInfo[], record: Record<string, RouteRecordRaw>): void {
  menus.forEach((menu: MenuInfo) => {
    const route = record[menu.id]
    if (route) {
      const meta = route.meta as RouteMeta
      // 有子节点时不要把父级 path/redirect 写成 url：
      // redirect 可能指向当前用户看不到的叶子（如 /vis → /vis/cards）。
      const hasKids = !!menu.children?.length
      if (!hasKids && isBlank(menu.url) && route.path)
        menu.url = route.path

      if (meta) {
        if (meta.menuName) {
          menu.name = meta.menuName
        }
        if (meta.menuIcon) {
          menu.icon = meta.menuIcon
        }
      }
    }
    else {
      // 菜单无关联路由 且 无url地址
      menu.hidden = isBlank(menu.url)
    }
    if (menu.children && menu.children.length > 0) {
      buildMenusInfo(menu.children, record)
    }

    if (menu.children && menu.children.length === 0) {
      delete menu.children
    }
    if (menu.hidden && menu.children?.some(child => !child.hidden))
      menu.hidden = false
  })
}

function cloneMenuTree(menus: MenuInfo[]): MenuInfo[] {
  return menus.map((menu) => {
    const raw = toRaw(menu)
    return {
      ...raw,
      children: raw.children?.length ? cloneMenuTree(raw.children) : undefined,
    }
  })
}

// 原地修改传入菜单的 children（调用方应传入 clone 后的副本）
function filterMenuTree(
  menus: MenuInfo[],
  filterFunc: (menu: MenuInfo) => boolean,
) {
  const filteredTree = menus.filter((menu) => {
    const isIncluded = filterFunc(menu)
    if (isIncluded)
      return true

    const children = menu.children
      ? filterMenuTree(menu.children, filterFunc)
      : []
    if (children.length > 0) {
      menu.children = children
      return true
    }

    return false
  })
  return filteredTree
}

function menuMatches(menu: MenuInfo, keyword: string) {
  return (menu.name || '').toLowerCase().includes(keyword)
}

function containsMenuId(menu: MenuInfo, menuId: string): boolean {
  if (menu.id === menuId)
    return true
  return menu.children?.some(child => containsMenuId(child, menuId)) ?? false
}

function menuPathname(url?: string) {
  if (!url)
    return ''
  const q = url.indexOf('?')
  const h = url.indexOf('#')
  let end = url.length
  if (q >= 0)
    end = Math.min(end, q)
  if (h >= 0)
    end = Math.min(end, h)
  return url.slice(0, end)
}

function containsPath(menu: MenuInfo, path: string): boolean {
  const menuPath = menuPathname(menu.url)
  if (menuPath && (menuPath === path || path.startsWith(`${menuPath}/`)))
    return true
  return menu.children?.some(child => containsPath(child, path)) ?? false
}

function firstVisibleLeafUrl(menu: MenuInfo): string | undefined {
  const children = (menu.children ?? []).filter(item => !item.hidden)
  for (const child of children) {
    const url = firstVisibleLeafUrl(child)
    if (url)
      return url
  }
  return isBlank(menu.url) ? undefined : menu.url
}

// 定义store: 用"use"开头，"store"结尾
export const useMenuStore = defineStore('menu', () => {
  const allMenus = ref<MenuInfo[]>([]) // 用户全菜单
  const activeRootId = ref('')
  const filterKeyword = ref('')
  let allMenuIdRoute: Record<string, RouteRecordRaw> = {} // 用户全菜单 id 路由映射

  const rootMenus = computed(() => allMenus.value.filter(menu => !menu.hidden))

  const menus = computed(() => {
    const root = allMenus.value.find(menu => menu.id === activeRootId.value)
    const children = (root?.children ?? []).filter(item => !item.hidden)
    const keyword = filterKeyword.value.trim().toLowerCase()
    if (!keyword)
      return children
    return filterMenuTree(cloneMenuTree(children), node => menuMatches(node, keyword))
  })

  const fetchUserMenus = async () => {
    const res = await fetchAccountMenus()
    const list = res.data?.list ?? []
    const menuList = [...list, ...constantMenu] as MenuInfo[]

    const menuIdRouteData: Record<string, RouteRecordRaw> = {}
    buildMenuIdRouterMap(routes, menuIdRouteData)
    buildMenusInfo(menuList, menuIdRouteData)

    allMenus.value = menuList
    allMenuIdRoute = menuIdRouteData
    if (!activeRootId.value || !rootMenus.value.some(menu => menu.id === activeRootId.value))
      activeRootId.value = rootMenus.value[0]?.id ?? ''
  }

  const filterMenus = (menuName: string) => {
    const keyword = menuName.trim()
    logger.debug(TAG, 'filter ', keyword)
    filterKeyword.value = keyword
  }

  const activateRoot = (rootId: string) => {
    if (activeRootId.value !== rootId) {
      activeRootId.value = rootId
      filterKeyword.value = ''
    }
  }

  const findFirstLeafUrl = (rootId: string) => {
    const root = allMenus.value.find(menu => menu.id === rootId)
    return root ? firstVisibleLeafUrl(root) : undefined
  }

  const resolveHomeUrl = () => {
    for (const root of rootMenus.value) {
      const url = firstVisibleLeafUrl(root)
      if (url)
        return url
    }
    return undefined
  }

  /** 仅壳路径落到该根下第一片叶子。/vis/report/9501 这类叶子不重定向。 */
  const resolveLandingUrl = (route: RouteLocationNormalized) => {
    const path = normalizePath(route.path)
    if (isHomePath(path))
      return resolveHomeUrl()
    if (!collectShellPaths(routes).has(path))
      return undefined

    const menuId = (route.meta.menuId || route.meta.rootMenuId) as string | undefined
    if (menuId) {
      const byId = allMenus.value.find(menu => menu.id === menuId)
      if (byId)
        return firstVisibleLeafUrl(byId)
    }
    const root = allMenus.value.find((menu) => {
      const rec = allMenuIdRoute[menu.id]
      return !!rec?.path && normalizePath(rec.path) === path
    })
    if (!root)
      return undefined
    return firstVisibleLeafUrl(root)
  }

  const routeBelongsToRoot = (route: RouteLocationNormalized, rootId: string) => {
    const root = allMenus.value.find(menu => menu.id === rootId)
    if (!root)
      return false
    const menuId = (route.meta.menuId || route.meta.rootMenuId) as string | undefined
    if (menuId && containsMenuId(root, menuId))
      return true
    return containsPath(root, route.path)
  }

  const syncActiveRootFromRoute = (route: RouteLocationNormalized) => {
    const menuId = (route.meta.menuId || route.meta.rootMenuId) as string | undefined
    if (menuId) {
      const root = allMenus.value.find(menu => containsMenuId(menu, menuId))
      if (root) {
        activeRootId.value = root.id
        return
      }
    }
    const byPath = allMenus.value.find(menu => containsPath(menu, route.path))
    if (byPath)
      activeRootId.value = byPath.id
  }

  const getAllMenuIdRoute = () => {
    return allMenuIdRoute
  }

  const clearMenus = () => {
    allMenus.value = []
    activeRootId.value = ''
    filterKeyword.value = ''
    allMenuIdRoute = {}
  }

  return {
    menus,
    rootMenus,
    activeRootId,
    filterKeyword,
    getAllMenuIdRoute,
    fetchUserMenus,
    filterMenus,
    activateRoot,
    findFirstLeafUrl,
    resolveHomeUrl,
    resolveLandingUrl,
    routeBelongsToRoot,
    syncActiveRootFromRoute,
    clearMenus,
  }
})
