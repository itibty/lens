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

function buildMenusInfo(menus: MenuInfo[], record: Record<string, RouteRecordRaw>): void {
  menus.forEach((menu: MenuInfo) => {
    const route = record[menu.id]
    if (route) {
      const { path, redirect } = route
      const meta = route.meta as RouteMeta
      if (redirect) {
        menu.url = redirect as string
      }
      else if (path) {
        menu.url = path
      }

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
    if (!activeRootId.value)
      activeRootId.value = rootMenus.value[0]?.id ?? ''
  }

  const filterMenus = (menuName: string) => {
    const keyword = menuName.trim()
    logger.debug(TAG, 'filter ', keyword)
    filterKeyword.value = keyword
  }

  const activateRoot = (rootId: string) => {
    if (activeRootId.value === rootId)
      return
    activeRootId.value = rootId
    filterKeyword.value = ''
  }

  const findFirstLeafUrl = (rootId: string) => {
    const root = allMenus.value.find(menu => menu.id === rootId)
    return root ? firstVisibleLeafUrl(root) : undefined
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
    syncActiveRootFromRoute,
    clearMenus,
  }
})
