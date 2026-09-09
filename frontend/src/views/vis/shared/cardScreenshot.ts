import dayjs from 'dayjs'
import { domToBlob } from 'modern-screenshot'
import { sanitizeFileName, saveBlobFile } from './cardExport'

const MAX_CANVAS_SIDE = 16384
const MAX_CANVAS_PIXELS = 32_000_000
const HIDDEN_ELEMENTS = [
  '.vis-card-view__actions',
  '.vis-card-view__remark-btn',
  '.dash-tile__handle',
  '.dash-tile__dot',
  '.el-scrollbar__bar',
  '.vchart-tooltip',
  '.vtable-tooltip',
  '.vtable__bubble-tooltip-element',
  '[role="tooltip"]',
  '[data-card-screenshot-ignore]',
].join(', ')

export function cardScreenshotScale(width: number, height: number) {
  return Math.min(2, MAX_CANVAS_SIDE / width, MAX_CANVAS_SIDE / height, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)))
}

/** 看板内截完整卡片外壳；独立预览截实际卡片，不带预览区留白。 */
export function cardScreenshotRoot(view: HTMLElement): HTMLElement {
  return (view.classList.contains('is-embedded') ? view.closest<HTMLElement>('.dash-tile') : null)
    ?? view.querySelector<HTMLElement>('.vis-card-view__body')
    ?? view
}

/** 将透明表面与祖先底色合成，图片离开看板后仍保持原来的明暗。 */
function cardBackground(root: HTMLElement) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx)
    throw new Error('截屏失败')
  const ancestors: HTMLElement[] = []
  for (let node: HTMLElement | null = root; node; node = node.parentElement)
    ancestors.unshift(node)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, 1, 1)
  for (const node of ancestors) {
    ctx.fillStyle = getComputedStyle(node).backgroundColor
    ctx.fillRect(0, 0, 1, 1)
  }
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return `rgb(${r}, ${g}, ${b})`
}

function prepareCardClone(node: Node, width: number, height: number) {
  if (!(node instanceof HTMLElement))
    return
  // 只改克隆节点，不影响页面里的滚动位置、卡片尺寸和编辑状态。
  Object.assign(node.style, {
    width: `${width}px`,
    height: `${height}px`,
    minWidth: `${width}px`,
    minHeight: `${height}px`,
    maxWidth: `${width}px`,
    maxHeight: `${height}px`,
    boxSizing: 'border-box',
    margin: '0',
    transform: 'none',
    outline: 'none',
    boxShadow: 'none',
    overflow: 'hidden',
    backdropFilter: 'none',
  })
  node.style.setProperty('-webkit-backdrop-filter', 'none')
  node.querySelectorAll<HTMLElement>(HIDDEN_ELEMENTS).forEach((el) => {
    el.style.setProperty('visibility', 'hidden', 'important')
  })
}

export async function captureCard(view: HTMLElement): Promise<Blob> {
  await document.fonts.ready
  const root = cardScreenshotRoot(view)
  if (root.querySelector('iframe'))
    throw new Error('含网页内容的卡片暂不支持截屏')
  const width = root.offsetWidth
  const height = root.offsetHeight
  if (!root.isConnected || width < 1 || height < 1)
    throw new Error('卡片尚未就绪')
  // 库会吞掉受污染画布的异常；提前检查，避免下载缺失图表的图片。
  for (const canvas of root.querySelectorAll('canvas')) {
    try {
      if (canvas.width && canvas.height && canvas.toDataURL() === 'data:,')
        throw new Error('Empty canvas')
    }
    catch {
      throw new Error('卡片含有无法截取的图片')
    }
  }
  const blob = await domToBlob(root, {
    type: 'image/png',
    width,
    height,
    scale: cardScreenshotScale(width, height),
    backgroundColor: cardBackground(root),
    maximumCanvasSize: MAX_CANVAS_SIDE,
    features: { restoreScrollPosition: true, copyScrollbar: false },
    onCloneNode: node => prepareCardClone(node, width, height),
  })
  if (!blob?.size)
    throw new Error('截屏失败')
  return blob
}

export function saveCardScreenshot(blob: Blob, title: string) {
  const name = sanitizeFileName(title) || '卡片'
  saveBlobFile(blob, `${name}_截屏_${dayjs().format('YYYYMMDDHHmmss')}.png`)
}
