import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSubscriptionPoller } from './subscriptionPolling'

afterEach(() => vi.useRealTimers())

describe('subscription result polling', () => {
  it('keeps refreshing beyond the initial 1.2 seconds until closed', async () => {
    vi.useFakeTimers()
    const statuses = ['QUEUED', 'RUNNING', 'SUCCESS']
    const seen: string[] = []
    const poller = createSubscriptionPoller(async () => {
      seen.push(statuses.shift() || 'SUCCESS')
    })
    poller.start()
    await vi.advanceTimersByTimeAsync(6100)
    expect(seen).toEqual(['QUEUED', 'RUNNING', 'SUCCESS'])
    poller.stop()
    await vi.advanceTimersByTimeAsync(10000)
    expect(seen).toHaveLength(3)
  })

  it('ignores an in-flight response after closing and does not restart itself', async () => {
    vi.useFakeTimers()
    let resolve!: () => void
    let updates = 0
    const response = new Promise<void>((done) => {
      resolve = done
    })
    const refresh = vi.fn(async (isCurrent: () => boolean) => {
      await response
      if (isCurrent())
        updates++
    })
    const poller = createSubscriptionPoller(refresh)
    poller.start()
    poller.stop()
    resolve()
    await vi.advanceTimersByTimeAsync(10000)
    expect(updates).toBe(0)
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('never overlaps requests within one open session', async () => {
    vi.useFakeTimers()
    let resolve!: () => void
    const refresh = vi.fn(() => new Promise<void>((done) => {
      resolve = done
    }))
    const poller = createSubscriptionPoller(refresh)
    poller.start()
    await vi.advanceTimersByTimeAsync(20000)
    expect(refresh).toHaveBeenCalledOnce()
    resolve()
    await vi.advanceTimersByTimeAsync(3000)
    expect(refresh).toHaveBeenCalledTimes(2)
    poller.stop()
    resolve()
  })
})
