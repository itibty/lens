import type { InjectionKey } from 'vue'

export interface DashCardQueryTracker {
  track: <T>(task: Promise<T>) => Promise<T>
  waitForIdle: (timeoutMs?: number) => Promise<void>
}

export const DASH_CARD_QUERY_TRACKER_KEY: InjectionKey<DashCardQueryTracker>
  = Symbol('dash-card-query-tracker')

export function createDashCardQueryTracker(): DashCardQueryTracker {
  const pending = new Set<Promise<unknown>>()

  function track<T>(task: Promise<T>): Promise<T> {
    const tracked = task as Promise<unknown>
    pending.add(tracked)
    void tracked.then(
      () => pending.delete(tracked),
      () => pending.delete(tracked),
    )
    return task
  }

  async function waitForIdle(timeoutMs = 15_000): Promise<void> {
    const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15_000
    const deadline = Date.now() + timeout

    // 让本轮响应式 watcher 先有机会注册查询。
    await Promise.resolve()
    while (pending.size) {
      const remaining = deadline - Date.now()
      if (remaining <= 0)
        throw new Error('等待看板数据超时')
      const batch = Array.from(pending)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('等待看板数据超时')), remaining)
        void Promise.allSettled(batch).then(() => {
          clearTimeout(timer)
          resolve()
        })
      })
      await Promise.resolve()
    }
  }

  return { track, waitForIdle }
}
