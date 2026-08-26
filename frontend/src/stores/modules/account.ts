/*
 * @Author: Chuang
 * @Date: 2022-12-12 13:26:13
 * @LastEditTime: 2026-03-20 14:38:55
 * @LastEditors: Chuang
 * @Description: 账号
 */

import { getAccountInfo, loginAccount as accountLogin, logoutAccount as accountLogout } from '@/apis/admin/account'
import { RequestConfig } from '@/core/config'
import { useKeepPageStore } from '@/stores/modules/keepPage'
import { useMenuStore } from '@/stores/modules/menu'
import { showNotify } from '@/utils'
import { CacheKeyNameEnum, storageUtil } from '@/utils/cache'
import { loginNotify } from '@/utils/date'
import { createLogger } from '@/utils/logger'

const logger = createLogger('ACCOUNT_STORE')

// 账号信息结构
function getDftUserInfo(): ADMIN.AccountInfo {
  return {
    id: '',
    username: '',
    realName: '',
    phone: '',
    email: '',
    avatar: '',
    status: 'EBL',
    roleCodes: [],
    functionCodes: [],
  }
}

export const useAccountStore = defineStore('account', () => {
  // states
  const userInfo = reactive<ADMIN.AccountInfo>(getDftUserInfo())

  // getters
  const permissionCodes = computed(() => [
    ...(userInfo.roleCodes ?? []),
    ...(userInfo.functionCodes ?? []),
  ])

  // actions
  const updateUserInfo = (next: ADMIN.AccountInfo): void => {
    userInfo.id = next.id
    userInfo.username = next.username
    userInfo.realName = next.realName
    userInfo.email = next.email
    userInfo.phone = next.phone
    userInfo.avatar = next.avatar
    userInfo.roleCodes = next.roleCodes
    userInfo.functionCodes = next.functionCodes
  }

  const login = async (loginInfo: ADMIN.LoginRequest) => {
    const { data } = await accountLogin(loginInfo)
    if (data?.token) {
      storageUtil.set(CacheKeyNameEnum.accessToken, data!.token)
      loginNotify()
    }
    else {
      showNotify(`登录失败`, `未正确返回${RequestConfig.tokenKey}...`, 'error')
      throw new Error(`未正确返回${RequestConfig.tokenKey}`)
    }
  }

  const fetchUserInfo = async () => {
    const { data } = await getAccountInfo()
    if (data?.info) {
      updateUserInfo(data.info)
      return
    }
    showNotify('获取用户信息失败', '返回数据格式错误', 'error')
    throw new Error('获取用户信息失败：返回数据格式错误')
  }

  const clearUserInfo = (): void => {
    storageUtil.del(CacheKeyNameEnum.accessToken)
    updateUserInfo(getDftUserInfo())
    useMenuStore().clearMenus()
    useKeepPageStore().clearPage()
  }

  const logout = async () => {
    try {
      await accountLogout()
    }
    catch (error) {
      logger.warn('登出接口调用失败，已清理本地登录态', error)
    }
    finally {
      clearUserInfo()
    }
  }

  const hasUserInfo = () => {
    return !!userInfo.id
  }

  const getUserInfo = () => {
    return userInfo
  }

  const hasFunction = (code: string) => {
    return permissionCodes.value.includes(code)
  }

  const hasAnyPermission = (codes: string[]) => {
    return codes.some(code => permissionCodes.value.includes(code))
  }

  const hasAllPermissions = (codes: string[]) => {
    return codes.every(code => permissionCodes.value.includes(code))
  }

  return {
    userInfo,
    permissionCodes,

    // -- 函数
    login,
    logout,
    fetchUserInfo,
    updateUserInfo,
    clearUserInfo,
    hasUserInfo,
    getUserInfo,
    hasFunction,
    hasAnyPermission,
    hasAllPermissions,
  }
})
