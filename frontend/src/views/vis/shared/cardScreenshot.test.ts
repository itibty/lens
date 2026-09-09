import type { Options } from 'modern-screenshot'
import { domToBlob } from 'modern-screenshot'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { captureCard, cardScreenshotRoot, cardScreenshotScale } from './cardScreenshot'

vi.mock('modern-screenshot', () => ({ domToBlob: vi.fn() }))
vi.mock('./cardExport', () => ({ sanitizeFileName: (name: string) => name, saveBlobFile: vi.fn() }))

const captureDom = vi.mocked(domToBlob as (node: Node, options?: Options) => Promise<Blob>)

class ElementStub {
  style: Record<string, unknown> = { setProperty: vi.fn() }
  parentElement = null
  offsetWidth = 480
  offsetHeight = 280
  isConnected = true
  classList = { contains: vi.fn(() => false) }
  closest = vi.fn()
  querySelector = vi.fn()
  querySelectorAll = vi.fn((): unknown[] => [])
}

function installDom() {
  vi.stubGlobal('HTMLElement', ElementStub)
  vi.stubGlobal('getComputedStyle', () => ({ backgroundColor: 'rgb(20, 30, 40)' }))
  vi.stubGlobal('document', {
    fonts: { ready: Promise.resolve() },
    createElement: () => ({
      getContext: () => ({ fillStyle: '', fillRect: vi.fn(), getImageData: () => ({ data: [20, 30, 40, 255] }) }),
    }),
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('card screenshots', () => {
  it('uses 2x for normal cards and limits both canvas dimensions and total pixels', () => {
    expect(cardScreenshotScale(480, 280)).toBe(2)
    for (const [width, height] of [[10000, 6000], [20000, 300], [1920, 1080]]) {
      const scale = cardScreenshotScale(width!, height!)
      expect(scale).toBeLessThanOrEqual(2)
      expect(width! * scale).toBeLessThanOrEqual(16384)
      expect(height! * scale).toBeLessThanOrEqual(16384)
      expect(width! * height! * scale * scale).toBeLessThanOrEqual(32_000_001)
    }
  })

  it('captures the nearest dashboard tile, including in fullscreen, and otherwise the visible card body', () => {
    const view = new ElementStub()
    const body = new ElementStub()
    const tile = new ElementStub()
    view.querySelector.mockReturnValue(body)
    view.closest.mockReturnValue(tile)
    expect(cardScreenshotRoot(view as unknown as HTMLElement)).toBe(body)
    view.classList.contains.mockReturnValue(true)
    expect(cardScreenshotRoot(view as unknown as HTMLElement)).toBe(tile)
    view.closest.mockReturnValue(null)
    expect(cardScreenshotRoot(view as unknown as HTMLElement)).toBe(body)
  })

  it('keeps the card viewport and scroll position without changing live DOM', async () => {
    installDom()
    const root = new ElementStub()
    const clone = new ElementStub()
    const action = new ElementStub()
    clone.querySelectorAll.mockReturnValue([action])
    captureDom.mockImplementation(async (_root, options) => {
      expect(options).toMatchObject({
        width: 480,
        height: 280,
        scale: 2,
        backgroundColor: 'rgb(20, 30, 40)',
        features: { restoreScrollPosition: true, copyScrollbar: false },
      })
      await options?.onCloneNode?.(clone as unknown as Node)
      return new Blob(['png'])
    })
    await captureCard(root as unknown as HTMLElement)
    expect(clone.style).toMatchObject({ height: '280px', overflow: 'hidden', outline: 'none', transform: 'none' })
    expect(action.style.setProperty).toHaveBeenCalledWith('visibility', 'hidden', 'important')
    expect(root.style.height).toBeUndefined()
    expect(root.style.setProperty).not.toHaveBeenCalled()
  })

  it('rejects iframe content and unreadable canvases instead of saving a partial image', async () => {
    installDom()
    const root = new ElementStub()
    root.querySelector.mockImplementation(selector => selector === 'iframe' ? {} : null)
    await expect(captureCard(root as unknown as HTMLElement)).rejects.toThrow('网页')
    root.querySelector.mockReturnValue(null)
    root.querySelectorAll.mockReturnValue([{
      width: 100,
      height: 100,
      toDataURL: () => {
        throw new Error('Tainted')
      },
    }])
    await expect(captureCard(root as unknown as HTMLElement)).rejects.toThrow('无法截取')
    expect(domToBlob).not.toHaveBeenCalled()
  })

  it('rejects a detached card and an empty image result', async () => {
    installDom()
    const root = new ElementStub()
    root.isConnected = false
    await expect(captureCard(root as unknown as HTMLElement)).rejects.toThrow('尚未就绪')
    root.isConnected = true
    captureDom.mockResolvedValue(new Blob())
    await expect(captureCard(root as unknown as HTMLElement)).rejects.toThrow('截屏失败')
  })
})
