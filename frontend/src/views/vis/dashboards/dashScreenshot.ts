import dayjs from 'dayjs'
import { domToBlob } from 'modern-screenshot'
import { sanitizeFileName, saveBlobFile } from '@/views/vis/shared/cardExport'

const EXPAND_SEL = [
  '.el-scrollbar',
  '.el-scrollbar__wrap',
  '.el-scrollbar__view',
  '.viewer__canvas',
]

const HIDE_SEL = [
  '.filter-dock__right',
  '.dash-tile__handle',
  '.dash-tile__dot',
  '.vis-card-view__actions',
  '.el-scrollbar__bar',
]

const MAX_CANVAS = 16384

function prepareClone(root: HTMLElement, width: number) {
  root.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
  root.style.height = 'auto'
  root.style.maxHeight = 'none'
  root.style.overflow = 'visible'
  root.style.setProperty('width', `${width}px`, 'important')
  root.style.setProperty('min-width', `${width}px`, 'important')
  root.style.setProperty('max-width', 'none', 'important')
  for (const sel of EXPAND_SEL) {
    root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.style.height = 'auto'
      el.style.maxHeight = 'none'
      el.style.overflow = 'visible'
    })
  }
  for (const sel of HIDE_SEL) {
    root.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      el.style.visibility = 'hidden'
    })
  }
  root.querySelectorAll<HTMLElement>(
    '.vis-rank-card, .vis-rank-card__podium, .vis-rank-card__athlete',
  ).forEach((el) => {
    el.style.setProperty('height', 'auto', 'important')
    el.style.setProperty('max-height', 'none', 'important')
  })
  root.querySelectorAll<HTMLElement>(
    '.vis-rank-card__medal, .vis-rank-card__athlete-name, .vis-rank-card__athlete-nums',
  ).forEach((el) => {
    el.style.position = 'relative'
    el.style.zIndex = '1'
  })
}

function measureCaptureSize(root: HTMLElement) {
  const chrome = root.querySelector<HTMLElement>('.viewer__chrome')
  const view = root.querySelector<HTMLElement>('.el-scrollbar__view')
  const canvas = root.querySelector<HTMLElement>('.viewer__canvas')
  const grid = root.querySelector<HTMLElement>('.dash-grid, .vgl-layout')
  const width = Math.ceil(Math.max(
    root.clientWidth,
    root.getBoundingClientRect().width,
    view?.scrollWidth ?? 0,
    canvas?.scrollWidth ?? 0,
    grid?.scrollWidth ?? 0,
    grid?.getBoundingClientRect().width ?? 0,
  ))
  const height = Math.ceil(Math.max(
    root.offsetHeight,
    (chrome?.offsetHeight ?? 0) + (view?.scrollHeight ?? root.scrollHeight),
    view?.scrollHeight ?? 0,
    grid?.scrollHeight ?? 0,
  ))
  return { width, height }
}

function fitScale(width: number, height: number) {
  const want = Math.min(2, window.devicePixelRatio || 1)
  return Math.min(
    want,
    MAX_CANVAS / Math.max(width, 1),
    MAX_CANVAS / Math.max(height, 1),
  )
}

export function dashScreenshotFileName(title: string) {
  const base = sanitizeFileName(title) || '看板'
  return `${base}_截屏_${dayjs().format('YYYYMMDDHHmmss')}.png`
}

/** 浏览器不能静默截当前页；用 DOM 出图才能一键，并带上画布图表。 */
export async function captureDashPreview(root: HTMLElement): Promise<Blob> {
  await document.fonts.ready
  const bg = getComputedStyle(root).backgroundColor || '#f5f6f7'
  const { width, height } = measureCaptureSize(root)
  const blob = await domToBlob(root, {
    type: 'image/png',
    width,
    height,
    scale: fitScale(width, height),
    backgroundColor: bg,
    maximumCanvasSize: MAX_CANVAS,
    style: {
      width: `${width}px`,
      minWidth: `${width}px`,
      maxWidth: 'none',
      boxSizing: 'border-box',
    },
    onCloneNode: (node) => {
      if (node instanceof HTMLElement)
        prepareClone(node, width)
    },
    onCreateForeignObjectSvg: (svg) => {
      const fo = svg.querySelector('foreignObject')
      if (!fo)
        return
      fo.setAttribute('x', '0')
      fo.setAttribute('y', '0')
      fo.setAttribute('width', String(width))
      fo.setAttribute('height', String(height))
    },
  })
  if (!blob?.size)
    throw new Error('截屏失败')
  return blob
}

export function saveDashScreenshot(blob: Blob, title: string) {
  saveBlobFile(blob, dashScreenshotFileName(title))
}
