/*
 * @Author: Chuang
 * @Date: 2023-01-12 10:19:26
 * @LastEditTime: 2025-12-15 21:23:27
 * @LastEditors: Chuang
 * @Description: 页面 keep-alive
 */
import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

export const useKeepPageStore = defineStore('keepPage', () => {
  // state
  const states = reactive({
    pages: [] as string[], // 路由页单文件组件名
    scrollTopMap: {} as Record<string, number>,
    stalePages: {} as Record<string, true>,
    /** 子页 → 带它进来的列表；写成功后只标这一页 */
    listByChild: {} as Record<string, string>,
  })

  // getters
  const pages = computed<string[]>(() => {
    return states.pages
  })
  const getScrollTop = (scrollKey: string) => {
    return states.scrollTopMap[scrollKey] || 0
  }
  const hasScrollTop = (scrollKey: string) => {
    return Object.hasOwn(states.scrollTopMap, scrollKey)
  }

  // actions
  const setScrollTop = (scrollKey: string, scrollTop: number) => {
    states.scrollTopMap[scrollKey] = scrollTop
  }
  const addPage = (pageName: string, scrollKey?: string, scrollTop?: number) => {
    if (!states.pages.includes(pageName))
      states.pages.push(pageName)

    if (scrollKey && scrollTop !== undefined)
      setScrollTop(scrollKey, scrollTop)
  }
  const forgetPage = (pageName: string) => {
    delete states.stalePages[pageName]
    for (const [child, list] of Object.entries(states.listByChild)) {
      if (list === pageName || child === pageName)
        delete states.listByChild[child]
    }
  }
  const removePage = (pageName: string, scrollKey?: string) => {
    states.pages = states.pages.filter(item => item !== pageName)
    if (scrollKey)
      delete states.scrollTopMap[scrollKey]
    forgetPage(pageName)
  }
  const clearPage = () => {
    states.pages = []
    states.scrollTopMap = {}
    states.stalePages = {}
    states.listByChild = {}
  }
  const rememberReturnList = (childName: string, listName: string) => {
    if (!childName || !listName || childName === listName)
      return
    states.listByChild[childName] = listName
  }
  const markPageStale = (listName: string) => {
    if (!listName)
      return
    states.stalePages[listName] = true
  }
  const markReturnListStale = (childName: string) => {
    const listName = states.listByChild[childName]
    if (listName)
      markPageStale(listName)
  }
  const consumeStale = (pageName: string) => {
    if (!states.stalePages[pageName])
      return false
    delete states.stalePages[pageName]
    return true
  }

  return {
    pages,
    getScrollTop,
    hasScrollTop,
    setScrollTop,
    addPage,
    removePage,
    clearPage,
    rememberReturnList,
    markPageStale,
    markReturnListStale,
    consumeStale,
  }
})
