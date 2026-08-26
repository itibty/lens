/*
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2025-12-15 21:25:28
 * @LastEditors: Chuang
 * @Description:
 */
/* eslint-disable perfectionist/sort-imports */
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationGeneric, RouteLocationNormalized, RouterScrollBehavior } from 'vue-router'

import ReportRoutes from './modules/reports'
import SysRoutes from './modules/sys'
import VisRoutes from './modules/vis'
import { setupNavigation } from './navigation'
import { useKeepPageStore } from '@/stores/modules/keepPage'
import Layout from '@/layout/index.vue' // 按eslint顺序组件初始化异常

export interface RouteMeta {
  menuId?: string
  menuName?: string
  menuIcon?: string
  title?: string // document.title 、 layout页面组件默认标题

  rootMenuId?: string // 非侧栏路由 所属菜单id(用于侧栏菜单高亮)
  componentName?: string // 如果router name 和 单文件组件名不一致 又想使用keepAlive, 此处可配置单文件组件名
}

export function getRouteScrollKey(route: RouteLocationNormalized): string {
  return route.fullPath
}

export const routes = [
  ...ReportRoutes,
  ...VisRoutes,
  ...SysRoutes,
  { path: '/permission/user', redirect: '/sys/users' },
  { path: '/permission/role', redirect: '/sys/roles' },
  { path: '/permission/menu', redirect: '/sys/menus' },
  { path: '/vis/dataset', redirect: '/vis/datasets' },
  { path: '/vis/dataset/edit', redirect: (to: RouteLocationGeneric) => ({ path: '/vis/datasets/edit', query: to.query, hash: to.hash }) },
  {
    path: '/reports/:id?',
    redirect: (to: RouteLocationGeneric) => {
      const raw = to.params.id || to.query.id
      const id = Array.isArray(raw) ? raw[0] : raw
      const query = { ...to.query }
      delete query.id
      return id
        ? { path: `/vis/report/${id}`, query, hash: to.hash }
        : { path: '/vis/report', query, hash: to.hash }
    },
  },
  // -- 公共路由
  {
    path: '/',
    component: Layout,
    redirect: '/index',
    children: [
      {
        path: '/index',
        name: 'Index',
        component: () => import('@/views/index.vue'),
        meta: { title: '首页' },
        // meta: { title: "首页", menuIcon: "home", menuId: "1" },
      },
      {
        path: '/account',
        name: 'Account',
        component: () => import('@/views/account/index.vue'),
        meta: { title: '个人中心' },
      },
      {
        path: '/url-frame',
        name: 'UrlFrame',
        component: () => import('@/views/common/url-frame.vue'),
        meta: { title: 'URL_Frame' },
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '用户登录' },
  },
  {
    path: '/404',
    name: '404',
    component: () => import('@/views/common/404.vue'),
  },
  { path: '/:path(.*)', redirect: '/404' },
]

const scrollBehavior: RouterScrollBehavior = (to) => {
  const keepPageStore = useKeepPageStore()
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ left: 0, top: keepPageStore.getScrollTop(getRouteScrollKey(to)) })
    }, 0)
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior, // 略显鸡肋
})

setupNavigation(router)

export default router
