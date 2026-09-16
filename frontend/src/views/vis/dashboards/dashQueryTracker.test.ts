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
  it('stops waiting for a tab that has been unmounted', async () => {
    const tracker = createDashCardQueryTracker()
    const owner = Symbol('card-query')
    tracker.track(new Promise<void>(() => {}), owner)
    const waiting = tracker.waitForIdle(100)
    tracker.forget(owner)
    await expect(waiting).resolves.toBeUndefined()
  })

  it('waits for the replacement query and ignores the stale completion', async () => {
    const tracker = createDashCardQueryTracker()
    const owner = Symbol('card-query')
    const old = deferred()
    const current = deferred()
    tracker.track(old.promise, owner)
    const waiting = tracker.waitForIdle(1_000)
    tracker.track(current.promise, owner)
    old.resolve()
    let idle = false
    void waiting.then(() => {
      idle = true
    })
    await Promise.resolve()
    expect(idle).toBe(false)
    current.resolve()
    await waiting
    expect(idle).toBe(true)
  })
})
