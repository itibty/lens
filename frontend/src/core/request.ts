/*
 * @Author: Chuang
 * @Date: 2023-01-12 10:29:56
 * @LastEditTime: 2026-05-22 18:26:48
 * @LastEditors: Chuang
 * @Description: axios封装
 */
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosRequestHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import axios from 'axios'
import { RequestConfig } from '@/core/config'
import { replaceToLoginFromCurrentRoute } from '@/router/navigation'
import { useAccountStore } from '@/stores/modules/account'
import { CacheKeyNameEnum, storageUtil } from '@/utils/cache'
import { createLogger } from '@/utils/logger'
import { isArray } from '@/utils/validate'

export interface RequestOptions extends AxiosRequestConfig {
  showErrorMessage?: boolean
}

const logger = createLogger('REQUEST')

function createUnauthorizedGuard() {
  let handled = false
  return {
    isHandled: () => handled,
    setHandled: () => { handled = true },
    reset: () => { handled = false },
  }
}

const unauthorizedGuard = createUnauthorizedGuard()

const axiosInstance: AxiosInstance = axios.create({
  baseURL: RequestConfig.baseURL,
  timeout: RequestConfig.timeout,
})

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 加公共请求头
    const accessToken = storageUtil.get(CacheKeyNameEnum.accessToken)
    const headers = config.headers as AxiosRequestHeaders
    if (accessToken) {
      unauthorizedGuard.reset()
      headers[RequestConfig.tokenKey] = accessToken
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.config.responseType === 'blob')
      return settleBlobResponse(response)

    const { data, config } = response
    const { code, msg } = data
    const successCodes = isArray(RequestConfig.successCode)
      ? [...RequestConfig.successCode]
      : [...[RequestConfig.successCode]]
    if (successCodes.includes(code)) {
      return data
    }
    else {
      handleErrorCode(code, msg, config.url || 'unknown', shouldShowErrorMessage(config))
      logger.error('请求异常', { url: config.url, code, msg })
      return Promise.reject(data)
    }
  },
  async (error) => {
    const { response, message } = error
    if (response && response.data) {
      const { status, data, config } = response
      const parsed = data instanceof Blob ? await readBlobJson(data) : null
      const msg = parsed?.msg || (data && typeof data === 'object' ? data.msg : '') || message
      handleErrorCode(status, msg, config.url, shouldShowErrorMessage(config))
      return Promise.reject(parsed || error)
    }
    else {
      let msg
      if (message === 'Network Error') {
        msg = '接口连接异常'
      }
      else if (message.includes('timeout')) {
        msg = '接口请求超时'
      }
      else if (message.includes('Request failed with status code')) {
        const code = message.slice(-3)
        msg = `接口${code}异常`
      }
      if (shouldShowErrorMessage(error.config))
        ElMessage.error(msg || `接口未知异常`)
      return Promise.reject(error)
    }
  },
)

export interface FileDownloadResult {
  blob: Blob
  filename?: string
}

function headerOf(headers: AxiosResponse['headers'], name: string) {
  if (!headers)
    return ''
  const getter = (headers as { get?: (key: string) => string }).get
  if (typeof getter === 'function')
    return getter.call(headers, name) || ''
  const rec = headers as Record<string, string>
  return rec[name] || rec[name.toLowerCase()] || ''
}

export function filenameFromDisposition(header?: string) {
  if (!header)
    return ''
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^["']|["']$/g, ''))
    }
    catch {
      return star[1].trim()
    }
  }
  const plain = /filename=([^;]+)/i.exec(header)
  if (!plain?.[1])
    return ''
  return plain[1].trim().replace(/^["']|["']$/g, '')
}

async function readBlobJson(blob: Blob): Promise<{ code?: number, msg?: string } | null> {
  try {
    const text = await blob.text()
    const start = text.trimStart()[0]
    if (!text || (start !== '{' && start !== '['))
      return null
    return JSON.parse(text) as { code?: number, msg?: string }
  }
  catch {
    return null
  }
}

async function blobLooksLikeJson(blob: Blob) {
  const head = (await blob.slice(0, 16).text()).trimStart()
  return head.startsWith('{') || head.startsWith('[')
}

async function settleBlobResponse(response: AxiosResponse<Blob>) {
  const blob = response.data
  const contentType = headerOf(response.headers, 'content-type') || blob.type || ''
  const asJson = contentType.includes('application/json') || await blobLooksLikeJson(blob)
  if (asJson) {
    const json = await readBlobJson(blob)
    const { code, msg } = json || {}
    const successCodes = isArray(RequestConfig.successCode)
      ? [...RequestConfig.successCode]
      : [...[RequestConfig.successCode]]
    if (code != null && successCodes.includes(code))
      return json
    handleErrorCode(code ?? 999, msg || '导出失败', response.config.url || 'unknown', shouldShowErrorMessage(response.config))
    return Promise.reject(json || { msg: '导出失败' })
  }
  return {
    blob,
    filename: filenameFromDisposition(headerOf(response.headers, 'content-disposition')),
  } satisfies FileDownloadResult
}

function shouldShowErrorMessage(config?: RequestOptions): boolean {
  return config?.showErrorMessage !== false
}

// code 数据状态码 或 http状态码
function handleErrorCode(code: number, msg: string, url: string, showErrorMessage: boolean): void {
  switch (code) {
    case 401: // 未登录 or 登录失效
      handleUnauthorized(showErrorMessage)
      break
    case 403: // 无权限
      showErrorMessage && ElMessage.error(`接口:${url} 无操作权限`)
      break
    case 404:
      showErrorMessage && ElMessage.error(`接口:${url} 不存在`)
      break
    case 999:
      showErrorMessage && ElMessage.error(msg || `接口${code}异常`)
      break
    default:
      showErrorMessage && ElMessage.error(msg || `接口${code}异常`)
      break
  }
}

function handleUnauthorized(showErrorMessage: boolean): void {
  if (unauthorizedGuard.isHandled())
    return

  unauthorizedGuard.setHandled()
  useAccountStore().clearUserInfo()
  replaceToLoginFromCurrentRoute({
    beforeRedirect: () => {
      if (showErrorMessage)
        ElMessage.error('登录已失效，请重新登录')
    },
  })
    .catch((error) => {
      logger.error('跳转登录页失败', error)
    })
}

// export default axiosInstance;
export default <T>(
  url: string,
  config?: RequestOptions,
): Promise<T> => {
  // response interceptor returns unwrapped data; assert past axios 1.19 AxiosResponseResult
  return axiosInstance(url, config) as Promise<T>
}
