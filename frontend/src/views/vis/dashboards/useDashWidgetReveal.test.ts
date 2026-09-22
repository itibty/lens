import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useDashWidgetReveal } from './useDashWidgetReveal'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function setup() {
  const animation = deferred()
  const rect = { top: -400, bottom: -100 }
  const target = {
    dataset: { dashWidgetKey: 't:copy' },
    isConnected: true,
    getAnimations: vi.fn(() => []),
    parentElement: { getAnimations: () => [{ finished: animation.promise }] },
    getBoundingClientRect: vi.fn(() => rect),
  }
  const container = {
    scrollTop: 900,
    scrollHeight: 1600,
    clientTop: 0,
    clientHeight: 400,
    getBoundingClientRect: () => ({ top: 100 }),
    querySelectorAll: () => [target],
    scrollTo: vi.fn(),
  }
  const scope = effectScope()
  const controls = scope.run(() => useDashWidgetReveal(() => container as unknown as HTMLElement))!
  return { animation, rect, target, container, scope, ...controls }
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0))
    return 1
  })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
})

afterEach(() => vi.unstubAllGlobals())

describe('dashboard added widget reveal', () => {
  it('waits for the grid animation and scrolls down only once using the settled position', async () => {
    const harness = setup()
    const pending = harness.reveal('t:copy')
    await vi.waitFor(() => expect(harness.target.getAnimations).toHaveBeenCalled())
    expect(harness.container.scrollTo).not.toHaveBeenCalled()
    expect(harness.target.getBoundingClientRect).not.toHaveBeenCalled()

    Object.assign(harness.rect, { top: 520, bottom: 820 })
    harness.animation.resolve()
    await pending
    expect(harness.container.scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 1200, behavior: 'smooth' })
    harness.scope.stop()
  })

  it.each([
    { top: 150, bottom: 450 },
    { top: 50, bottom: 550 },
  ])('does not scroll when the widget is already visible or covers the viewport: %o', async (rect) => {
    const harness = setup()
    Object.assign(harness.rect, rect)
    harness.animation.resolve()
    await harness.reveal('t:copy')
    expect(harness.container.scrollTo).not.toHaveBeenCalled()
    harness.scope.stop()
  })

  it('discards an earlier pending reveal when another copy is requested', async () => {
    const harness = setup()
    const first = harness.reveal('t:copy')
    await vi.waitFor(() => expect(harness.target.getAnimations).toHaveBeenCalledOnce())
    const second = harness.reveal('t:copy')
    Object.assign(harness.rect, { top: 520, bottom: 820 })
    harness.animation.resolve()
    await Promise.all([first, second])
    expect(harness.container.scrollTo).toHaveBeenCalledOnce()
    harness.scope.stop()
  })

  it.each(['cancel', 'dispose'] as const)('does not scroll after %s while awaiting layout', async (action) => {
    const harness = setup()
    const pending = harness.reveal('t:copy')
    await vi.waitFor(() => expect(harness.target.getAnimations).toHaveBeenCalled())
    if (action === 'cancel')
      harness.cancel()
    else
      harness.scope.stop()
    harness.animation.resolve()
    await pending
    expect(harness.container.scrollTo).not.toHaveBeenCalled()
    harness.scope.stop()
  })
})
