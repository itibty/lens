/*
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2025-06-12 11:14:54
 * @LastEditors: Chuang
 * @Description: 应用
 */
import { CacheKeyNameEnum, storageUtil } from '@/utils/cache'

interface AppSetting {
  sidebarFold: boolean
}

export const useAppStore = defineStore('app', () => {
  // states
  const appSetting = ref<AppSetting>({
    sidebarFold: storageUtil.get(CacheKeyNameEnum.sidebarFold) === '1',
  })

  // actions
  const toggleSidebarFold = (persist = false) => {
    appSetting.value.sidebarFold = !appSetting.value.sidebarFold
    persist && storageUtil.set(
      CacheKeyNameEnum.sidebarFold,
      appSetting.value.sidebarFold ? '1' : '0',
    )
  }

  const setSidebarFold = (fold: boolean, persist = false) => {
    appSetting.value.sidebarFold = fold
    persist && storageUtil.set(
      CacheKeyNameEnum.sidebarFold,
      appSetting.value.sidebarFold ? '1' : '0',
    )
  }

  return {
    appSetting,
    toggleSidebarFold,
    setSidebarFold,
  }
})
