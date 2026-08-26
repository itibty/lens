import { httpPost } from '@/apis/common'
import { AppConfig } from '@/core/config'
import { useAccountStore } from '@/stores/modules/account'
import { getAttachInfo } from '@/utils'
import { CacheKeyNameEnum, storageUtil } from '@/utils/cache'
import { formatTimeMs } from '@/utils/date'
import { createLogger } from '@/utils/logger'

export const traceEvents: Record<string, TraceEvent> = {
  tap_phone: { traceCode: 'tap_phone', traceDesc: '点击电话咨询' },
}

// 从环境变量读取埋点配置
const TRACE_LOG_URL = import.meta.env.VITE_TRACE_LOG_URL
const TRACE_LOG_TOKEN = import.meta.env.VITE_TRACE_LOG_TOKEN
const MAX_CACHE_COUNT = 30
const MAX_CACHE_BYTES = 200 * 1024
const logger = createLogger('TRACE')

export class TraceManager {
  private static instance: TraceManager
  private POST_TRACE_LOG_URL: string = ''
  private POST_ON_Off: boolean = true
  private traceLogSet = new Set()
  private postTraceLogTimeId: NodeJS.Timeout | null = null
  private initialized: boolean = false
  private static TAG: string = 'TraceEvent===>'

  public static getInstance(): TraceManager {
    if (!TraceManager.instance) {
      TraceManager.instance = new TraceManager()
    }
    return TraceManager.instance
  }

  public init(config: { onOff?: boolean }): void {
    if (config.onOff !== undefined) {
      this.POST_ON_Off = config.onOff
    }
    if (this.initialized)
      return

    this.initialized = true
    // 构建埋点上报 URL
    if (TRACE_LOG_URL && TRACE_LOG_TOKEN) {
      this.POST_TRACE_LOG_URL = `${TRACE_LOG_URL}?accessToken=${TRACE_LOG_TOKEN}`
    }
    else {
      this.POST_ON_Off = false
      logger.warn('埋点服务未配置，已禁用埋点功能')
    }
    // 页面关闭/隐藏时强制 flush，防止最后一批日志丢失
    addEventListener('pagehide', () => this.flush())
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden')
        this.flush()
    })
  }

  // 强制立即发送当前缓存的日志
  public flush(): void {
    if (this.postTraceLogTimeId) {
      clearTimeout(this.postTraceLogTimeId)
      this.postTraceLogTimeId = null
    }
    if (this.traceLogSet.size > 0) {
      const cacheTraceLogList = this.getTraceLog()
      const traceLogList = [...cacheTraceLogList, ...[...this.traceLogSet]]
      this.traceLogSet.clear()
      this.postTraceLog(traceLogList, { keepalive: true })
    }
  }

  // 处理埋点事件
  public triggerEvent(eventTypeCode: string | TraceEvent): void {
    let traceTarget: TraceEvent | null | undefined = null

    if (typeof eventTypeCode === 'string') {
      traceTarget = traceEvents[eventTypeCode]
    }
    else {
      traceTarget = eventTypeCode
    }

    if (!traceTarget || !traceTarget.traceCode) {
      logger.warn(`${eventTypeCode} 找不到埋点定义`)
      return
    }

    const event = this.generateEventObj(traceTarget)
    this.traceLogSet.add(event)
    logger.debug(event, this.traceLogSet.size)
    if (this.postTraceLogTimeId) {
      clearTimeout(this.postTraceLogTimeId)
    }
    // 防抖：无新事件触发的3s后 ，发送traceLog集合
    this.postTraceLogTimeId = setTimeout(() => {
      const cacheTraceLogList = this.getTraceLog()
      const traceLogList = [...cacheTraceLogList, ...[...this.traceLogSet]]
      this.postTraceLog(traceLogList)
      this.traceLogSet.clear()
      this.postTraceLogTimeId = null
    }, 3000)
  }

  // 生成埋点事件对象
  private generateEventObj(target: TraceEvent) {
    const timestamp = Date.now()

    return {
      traceInfo: {
        ...target,
        timestamp,
        dateTime: formatTimeMs(timestamp),
      },
      userInfo: this.getUserInfo(),
      pageInfo: this.getPageInfo(),
      appInfo: {
        env: AppConfig.env,
        ...getAttachInfo(),
      },
      deviceInfo: this.getDeviceInfo(),
      networkInfo: this.getNetworkInfo(),
    }
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      language: navigator.language || (navigator.languages && navigator.languages[0]) || '',
      online: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      pixelDensity: window.devicePixelRatio,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    }
  }

  private getNetworkInfo(): NetworkInfo {
    const network: NetworkInfo = {}
    if ('connection' in navigator) {
      const conn = navigator.connection as { effectiveType?: string, rtt?: number, downlink?: number, saveData?: boolean }
      network.effectiveType = conn.effectiveType
      network.rtt = conn.rtt
      network.downlink = conn.downlink
      network.saveData = conn.saveData
    }
    return network
  }

  private getPageInfo(): PageInfo {
    return {
      url: window.location.href,
      referrer: document.referrer,
      timestamp: Date.now(),
      scrollWidth: document.documentElement.scrollWidth || document.body.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight || document.body.scrollHeight,
    }
  }

  private getUserInfo(): { isLogin: boolean, id?: number } {
    const accountStore = useAccountStore()
    const accountInfo = accountStore.getUserInfo()
    if (accountInfo?.id) {
      return { isLogin: true, id: Number(accountInfo.id) || undefined }
    }
    return { isLogin: false }
  }

  // 上传埋点日志
  private postTraceLog(traceLogList: TraceEvent[], options: PostTraceOptions = {}): void {
    if (!this.POST_ON_Off || !this.POST_TRACE_LOG_URL)
      return

    const params: TraceLogRequest = { clientTraceLogList: traceLogList }

    if (options.keepalive && this.postTraceLogWithKeepalive(params, traceLogList))
      return

    httpPost(this.POST_TRACE_LOG_URL, params)
      .then(() => {
        logger.debug(`上传日志:${traceLogList.length}`)
        this.setTraceLog([])
      })
      .catch((err) => {
        logger.error(err)
        this.setTraceLog(traceLogList)
      })
  }

  private postTraceLogWithKeepalive(params: TraceLogRequest, traceLogList: TraceEvent[]): boolean {
    const body = JSON.stringify(params)
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      const queued = navigator.sendBeacon(this.POST_TRACE_LOG_URL, blob)
      if (queued) {
        logger.debug(`上传日志:${traceLogList.length}`)
        this.setTraceLog([])
        return true
      }
    }

    if (typeof fetch !== 'function')
      return false

    fetch(this.POST_TRACE_LOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
      .then((res) => {
        if (res.ok) {
          logger.debug(`上传日志:${traceLogList.length}`)
          this.setTraceLog([])
        }
        else {
          this.setTraceLog(traceLogList)
        }
      })
      .catch((err) => {
        logger.error(err)
        this.setTraceLog(traceLogList)
      })
    return true
  }

  private setTraceLog(traceLogList: TraceEvent[]) {
    const limitedTraceLogList = this.limitTraceLogCache(traceLogList)
    if (limitedTraceLogList.length === 0) {
      storageUtil.del(CacheKeyNameEnum.traceLog)
      return
    }

    const jsonData = JSON.stringify(limitedTraceLogList)
    storageUtil.set(CacheKeyNameEnum.traceLog, jsonData)
  }

  private limitTraceLogCache(traceLogList: TraceEvent[]) {
    const limitedTraceLogList = traceLogList.slice(-MAX_CACHE_COUNT)
    while (limitedTraceLogList.length > 0 && getStringByteLength(JSON.stringify(limitedTraceLogList)) > MAX_CACHE_BYTES) {
      limitedTraceLogList.shift()
    }
    return limitedTraceLogList
  }

  private getTraceLog() {
    const data = storageUtil.get(CacheKeyNameEnum.traceLog)
    if (data) {
      try {
        return JSON.parse(data)
      }
      catch (error) {
        logger.warn('埋点缓存解析失败，已清空缓存', error)
        storageUtil.del(CacheKeyNameEnum.traceLog)
      }
    }
    return []
  }
}

function getStringByteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

interface TraceEvent {
  traceCode: string
  traceDesc: string
  eventType?: string
  eventDesc?: string
  traceParams?: Record<string, unknown>
}

interface TraceLogRequest {
  clientTraceLogList: TraceEvent[]
}

interface PostTraceOptions {
  keepalive?: boolean
}

interface PageInfo {
  url: string // 页面URL
  referrer: string // 来源页面
  timestamp: number // 时间戳
  scrollWidth: number // 文档的可滚动宽度
  scrollHeight: number // 文档的可滚动高度
  [key: string]: any // 允许任意的额外字段
}

interface DeviceInfo {
  userAgent: string // 用户代理字符串
  screenWidth: number // 屏幕宽度
  screenHeight: number // 屏幕高度
  language: string // 语言
  online: boolean // 在线状态
  hardwareConcurrency: number // 硬件并发线程数
  pixelDensity: number // 像素密度
  windowWidth: number // 窗口宽度
  windowHeight: number // 窗口高度
}

interface NetworkInfo {
  effectiveType?: string // 有效连接类型
  rtt?: number // 回程时间
  downlink?: number // 下行带宽
  saveData?: boolean // 是否启用数据节省模式
}
