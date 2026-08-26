/*
 * @Author: Chuang
 * @Date: 2023-01-09 09:53:35
 * @LastEditTime: 2025-08-22 17:57:48
 * @LastEditors: Chuang
 * @Description: [local|session]storage & cookie 封装
 */

export enum CacheKeyNameEnum {
  accessToken = 'access_token',
  clientId = 'client_id',
  sidebarFold = 'sidebar_fold',
  username = 'username',
  password = 'password',
  traceLog = 'traceLog',
}

const storageConfig = {
  prefix: 'NA:', // key 前缀
  type: 'ls', // ls -> localStorage | ss -> sessionStorage
}

function getStorage(type?: string) {
  return (type || storageConfig.type) === 'ls'
    ? localStorage
    : sessionStorage
}

// storage 工具
export const storageUtil = {
  set: (
    key: string,
    val: string,
    type?: 'ls' | 'ss',
  ): void => {
    const storage: Storage = getStorage(type)
    storage.setItem(`${storageConfig.prefix}${key}`, val)
  },
  get: (key: string, type?: 'ls' | 'ss'): string | null => {
    const storage: Storage = getStorage(type)
    return storage.getItem(`${storageConfig.prefix}${key}`)
  },
  del: (key: string, type?: 'ls' | 'ss'): void => {
    const storage: Storage = getStorage(type)
    storage.removeItem(`${storageConfig.prefix}${key}`)
  },
  clear: (): void => {
    [localStorage, sessionStorage].forEach((storage: Storage) => {
      const keys: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key?.startsWith(storageConfig.prefix))
          keys.push(key)
      }
      keys.forEach(key => storage.removeItem(key))
    })
  },
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}

// cookie 工具
export const cookieUtil = {
  set: (name: string, value: string, days?: number): void => {
    const encodedName = encodeURIComponent(name)
    const encodedValue = encodeURIComponent(value || '')
    let expires = ''
    if (days) {
      const date = new Date()
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))
      expires = `; expires=${date.toUTCString()}`
    }
    document.cookie = `${encodedName}=${encodedValue}${expires}; path=/; SameSite=Lax; Secure`
  },

  get: (name: string): string | null => {
    const nameEQ = `${encodeURIComponent(name)}=`
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      const c = ca[i]!.trim()
      if (c.indexOf(nameEQ) === 0) {
        return safeDecodeURIComponent(c.substring(nameEQ.length, c.length))
      }
    }
    return null
  },
  delete: (name: string): void => {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
  },
}
