import type { InjectionKey } from 'vue'

export interface DashCardQueryTracker {
  track: <T>(task: Promise<T>, owner?: symbol) => Promise<T>
  forget: (owner: symbol) => void
  waitForIdle: (timeoutMs?: number) => Promise<void>
}

export const DASH_CARD_QUERY_TRACKER_KEY: InjectionKey<DashCardQueryTracker>
  = Symbol('dash-card-query-tracker')

export function createDashCardQueryTracker(): DashCardQueryTracker {
  const pending = new Map<symbol, { settled: Promise<void>, release: () => void }>()

  function forget(owner: symbol) {
    pending.get(owner)?.release()
  }

  function track<T>(task: Promise<T>, owner = Symbol('card-query')): Promise<T> {
    forget(owner)
    let done!: () => void
    const settled = new Promise<void>((resolve) => {
      done = resolve
    })
    const entry = {
      settled,
      release: () => {
        if (pending.get(owner) === entry)
          pending.delete(owner)
        done()
      },
    }
    pending.set(owner, entry)
    void task.then(entry.release, entry.release)
    return task
  }

  async function waitForIdle(timeoutMs = 15_000): Promise<void> {
    const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15_000
    const deadline = Date.now() + timeout
    await Promise.resolve()
    while (pending.size) {
      const remaining = deadline - Date.now()
      if (remaining <= 0)
        throw new Error('等待看板数据超时')
      const batch = Array.from(pending.values(), entry => entry.settled)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('等待看板数据超时')), remaining)
        void Promise.all(batch).then(() => {
          clearTimeout(timer)
          resolve()
        })
      })
      await Promise.resolve()
    }
  }

  return { track, forget, waitForIdle }
}
