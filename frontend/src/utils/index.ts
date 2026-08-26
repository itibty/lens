/*
 * @Author: Chuang
 * @Date: 2022-12-30 18:09:32
 * @LastEditTime: 2026-03-20 15:00:05
 * @LastEditors: Chuang
 * @Description:
 */

import { AppConfig } from '@/core/config'
import { CacheKeyNameEnum, storageUtil } from '@/utils/cache'
import { createLogger } from '@/utils/logger'

const logger = createLogger('UTILS')

export function showNotify(title: string, message: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') {
  ElNotification({
    title,
    message,
    type,
  })
}
export function showToast(message?: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') {
  ElMessage({
    message,
    type,
  })
}
export function showAlert(content: string, title: string = '温馨提示', type: 'warning' | 'info' | 'error' | '' = 'warning') {
  ElMessageBox.alert(content, title, { type })
}
export function showConfirm(content: string, title: string = '温馨提示', type: 'warning' | 'info' | 'error' | '' = 'warning', okCallback?: Function, cancelCallback?: Function) {
  ElMessageBox.confirm(content, title, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    closeOnClickModal: false,
    type,
  })
    .then(() => {
      if (okCallback)
        okCallback()
    })
    .catch(() => {
      if (cancelCallback)
        cancelCallback()
    })
}

/** 删除后计算应停留的页码，避免末页删空仍停在空页 */
export function getPageAfterDelete(
  pageNumber: number,
  pageSize: number,
  total: number,
  deleteCount = 1,
): number {
  const remaining = Math.max(0, total - deleteCount)
  const maxPage = Math.max(1, Math.ceil(remaining / pageSize) || 1)
  return Math.min(Math.max(1, pageNumber), maxPage)
}

// 获取根对象
export function getGlobalObj(): Window {
  return window
}

// 替代 eval, 参数是 对象字符串，对象属性可以带函数
export function evil(fn: string, timeout: number = 5000): any {
  const startTime = Date.now()
  const Fn = Function
  const result = new Fn(`return ${fn}`)()
  // 简单检查执行时间，防止意外死循环
  if (Date.now() - startTime > timeout) {
    logger.warn('[evil] 代码执行时间较长，请检查是否有死循环')
  }
  return result
}

// eval避免eslint警告
export function evalScript(fn: string) {
  // eslint-disable-next-line no-eval
  return eval(fn)
}

// object转string，用于query传参
export function o2s(object: unknown): string {
  try {
    return encodeURIComponent(bytesToBase64(new TextEncoder().encode(JSON.stringify(object))))
  }
  catch (error) {
    logger.error(error)
    return ''
  }
}

// string转object，用于query传参
export function s2o(objectString: string): unknown | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64ToBytes(decodeURIComponent(objectString))))
  }
  catch (error) {
    logger.error(error)
    return null
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// 获取url query参数
export function getUrlQuery(url?: string): Map<string, string> {
  url = url || location.href
  const paramsMap = new Map<string, string>()
  // 使用 URLSearchParams API 替代正则，更安全可靠
  try {
    const urlObj = new URL(url, window.location.origin)
    urlObj.searchParams.forEach((value, key) => {
      paramsMap.set(key, value)
    })
  }
  catch {
    // 如果 URL 解析失败，尝试从字符串中提取
    const searchIndex = url.indexOf('?')
    if (searchIndex !== -1) {
      const hashIndex = url.indexOf('#', searchIndex)
      const searchParams = url.slice(searchIndex + 1, hashIndex === -1 ? undefined : hashIndex)
      new URLSearchParams(searchParams).forEach((value, key) => {
        paramsMap.set(key, value)
      })
    }
  }
  return paramsMap
}

// 获取obj类型名
export function getObjType(obj: unknown): string {
  const type = typeof obj
  if (type !== 'object') {
    return type
  }
  else {
    return Object.prototype.toString.call(obj).replace(/^\[object (\S+)\]$/, '$1') // 注意正则中间有个空格;
  }
}

// 修改页面路由，但不刷新页面
// eg: 替换url query参数： const newUrl = this.$route.path + `?storeId=${this.storeId}`;
export function silentReplaceUrl(newUrl: string) {
  window.history.replaceState('', '', newUrl)
}

/**
 * 生成guid随机数（使用 crypto.randomUUID，基于密码学安全随机数）
 * @returns guid随机数
 */
export function guid() {
  return crypto.randomUUID()
}
export function getClientId() {
  let clientId = storageUtil.get(CacheKeyNameEnum.clientId)
  if (!clientId) {
    clientId = guid()
    storageUtil.set(CacheKeyNameEnum.clientId, clientId)
  }
  return clientId
}

export function getAttachInfo() {
  return {
    appCode: AppConfig.appCode,
    appVersion: AppConfig.appVersion,
    clientId: getClientId(),
    channel: AppConfig.channel,
    subChannel: AppConfig.subChannel,
  }
};
