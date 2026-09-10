import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PREPARE_CHART_SCREENSHOT_EVENT,
  prepareChartsForScreenshot,
} from './chartScreenshot'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('chart screenshot preparation', () => {
  it('asks every chart to render its final animation frame before capture', async () => {
    const firstReady = vi.fn()
    const secondReady = vi.fn()
    const root = {
      querySelectorAll: vi.fn(() => [
        { dispatchEvent: firstReady },
        { dispatchEvent: secondReady },
      ]),
    } as unknown as HTMLElement
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal('CustomEvent', class {
      constructor(public type: string) {}
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      queueMicrotask(() => callback(performance.now()))
      return frames.length
    })

    await prepareChartsForScreenshot(root)

    expect(firstReady).toHaveBeenCalledOnce()
    expect(secondReady).toHaveBeenCalledOnce()
    expect(firstReady.mock.calls[0]?.[0]).toMatchObject({ type: PREPARE_CHART_SCREENSHOT_EVENT })
    expect(frames).toHaveLength(2)
  })
})
