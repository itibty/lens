import { describe, expect, it } from 'vitest'
import { createDashCardQueryTracker } from './dashQueryTracker'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('dashboard card query tracker', () => {
  it('waits for every tracked query to settle', async () => {
    const tracker = createDashCardQueryTracker()
    const first = deferred()
    const second = deferred()
    tracker.track(first.promise)

    let idle = false
    const waiting = tracker.waitForIdle(1_000).then(() => {
      idle = true
    })
    tracker.track(second.promise)
    first.resolve()
    await Promise.resolve()
    expect(idle).toBe(false)

    second.resolve()
    await waiting
    expect(idle).toBe(true)
  })

  it('removes rejected queries from the pending set', async () => {
    const tracker = createDashCardQueryTracker()
    const failed = tracker.track(Promise.reject(new Error('query failed')))
    await expect(failed).rejects.toThrow('query failed')
    await expect(tracker.waitForIdle(100)).resolves.toBeUndefined()
  })
})
