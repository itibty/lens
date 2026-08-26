/*
 * @Author: Chuang
 * @Date: 2025-07-28 14:18:47
 * @LastEditTime: 2025-08-05 19:18:30
 * @LastEditors: Chuang
 * @Description: 检查相关
 */

import { createLogger } from '@/utils/logger'

const logger = createLogger('CHECKER')

interface AppVersion {
  buildId: string
  buildTime?: string
  commit?: string
  mode?: string
  version?: string
}

const DEFAULT_VERSION_URL = '/version.json'
const DEFAULT_REQUEST_TIMEOUT = 10 * 1000

// 检测前端资源更新
export function useResourceUpdateChecker(versionUrl: string = DEFAULT_VERSION_URL, interval: number = 5 * 60 * 1000) {
  const isChecking = ref(false)
  let timer: ReturnType<typeof setInterval> | undefined
  let updateConfirmTask: Promise<unknown> | undefined
  let dismissedBuildId: string | undefined

  async function check() {
    if (isChecking.value || updateConfirmTask || !canCheckResourceUpdate())
      return

    isChecking.value = true

    try {
      const latestVersion = await getLatestVersion(versionUrl)
      if (latestVersion && latestVersion.buildId !== __APP_VERSION__.buildId && latestVersion.buildId !== dismissedBuildId)
        showUpdateConfirm(latestVersion.buildId)
    }
    finally {
      isChecking.value = false
    }
  }

  function showUpdateConfirm(buildId: string) {
    updateConfirmTask = ElMessageBox.confirm(
      '检测到新内容变更，是否刷新？',
      '版本更新',
      { confirmButtonText: '立即更新', cancelButtonText: '稍后处理', type: 'warning' },
    )
      .then(() => window.location.reload())
      .catch(() => {
        dismissedBuildId = buildId
      })
      .finally(() => {
        updateConfirmTask = undefined
      })
  }

  onMounted(() => {
    if (!isClientRuntime())
      return

    check()
    timer = setInterval(check, interval)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
  })

  onUnmounted(() => {
    if (timer)
      clearInterval(timer)
    document.removeEventListener('visibilitychange', check)
    window.removeEventListener('online', check)
  })

  return { check, isChecking }
}

function isClientRuntime(): boolean {
  return typeof window !== 'undefined'
    && typeof document !== 'undefined'
    && typeof navigator !== 'undefined'
}

function canCheckResourceUpdate(): boolean {
  return isClientRuntime() && !document.hidden && navigator.onLine
}

async function getLatestVersion(versionUrl: string): Promise<AppVersion | undefined> {
  try {
    const response = await fetchWithTimeout(addCacheBust(versionUrl), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    })

    if (!response.ok)
      return undefined

    const version = await response.json() as Partial<AppVersion>
    if (!version.buildId)
      return undefined

    return version as AppVersion
  }
  catch (error) {
    logger.error(`版本更新检查失败: ${versionUrl}`, error)
    return undefined
  }
}

function addCacheBust(url: string): string {
  const targetUrl = new URL(url, window.location.origin)
  targetUrl.searchParams.set('_t', String(Date.now()))
  return targetUrl.toString()
}

function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT)

  return fetch(url, {
    ...init,
    signal: controller.signal,
  }).finally(() => clearTimeout(timer))
}
