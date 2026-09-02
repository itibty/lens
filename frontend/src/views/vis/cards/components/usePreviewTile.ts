import type { MaybeRefOrGetter } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { isNumberChart, isProgressChart, isTrendChart } from '@/views/vis/shared/types'

/** 宽近看板 4 列。进度/趋势要更高才放得下环和走势；指标卡跟看板 4×5 即可 */
const NUMBER_TILE = { w: 240, h: 188 } as const
const TALL_TILE = { w: 240, h: 268 } as const

export const PREVIEW_TILE_DEFAULT = {
  number: NUMBER_TILE,
  progress: TALL_TILE,
  trend: TALL_TILE,
  fill: null,
} as const

const TILE_MIN_W = 168
/** 低于完整小卡（标题+环/条+数值）；仍可拖到看板 4×5 附近看紧凑效果 */
const TILE_MIN_H = 188
const STAGE_INSET = 8
/** 拖位置 / 改尺寸时对齐，方便和看板格子对一下 */
const SNAP = 8

export type PreviewTileKind = keyof typeof PREVIEW_TILE_DEFAULT

export function previewTileKind(chartType?: string): PreviewTileKind | null {
  if (isTrendChart(chartType))
    return 'trend'
  if (isProgressChart(chartType))
    return 'progress'
  if (isNumberChart(chartType))
    return 'number'
  return String(chartType || '').trim() ? 'fill' : null
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function snap(n: number) {
  return Math.round(n / SNAP) * SNAP
}

function tileHostOf(event: PointerEvent) {
  return (event.currentTarget as HTMLElement | null)?.closest('.preview__tile')
}

function trackPointer(onMove: (event: PointerEvent) => void, onEnd: () => void) {
  const move = (event: PointerEvent) => onMove(event)
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    onEnd()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

/** 设计页预览格：可拖位置、可改尺寸，刷新回默认，不落 localStorage */
export function usePreviewTile(
  kind: MaybeRefOrGetter<PreviewTileKind | null>,
  stage: MaybeRefOrGetter<HTMLElement | null | undefined>,
) {
  const tileW = ref<number | null>(null)
  const tileH = ref<number | null>(null)
  const tileX = ref<number | null>(null)
  const tileY = ref<number | null>(null)
  const tileDragging = ref(false)
  const tileMoving = ref(false)
  let userPlaced = false

  function stageSize() {
    const el = toValue(stage)
    if (!el)
      return { w: 0, h: 0 }
    return { w: el.clientWidth, h: el.clientHeight }
  }

  function currentTileSize() {
    const { w: sw, h: sh } = stageSize()
    return {
      w: tileW.value ?? Math.max(0, sw - STAGE_INSET * 2),
      h: tileH.value ?? Math.max(0, sh - STAGE_INSET * 2),
    }
  }

  function moveBounds(w: number, h: number) {
    const { w: sw, h: sh } = stageSize()
    return {
      minX: STAGE_INSET,
      minY: STAGE_INSET,
      maxX: Math.max(STAGE_INSET, sw - w - STAGE_INSET),
      maxY: Math.max(STAGE_INSET, sh - h - STAGE_INSET),
    }
  }

  function sizeBounds() {
    const x = tileX.value ?? STAGE_INSET
    const y = tileY.value ?? STAGE_INSET
    const { w: sw, h: sh } = stageSize()
    return {
      maxW: Math.max(TILE_MIN_W, sw - x - STAGE_INSET),
      maxH: Math.max(TILE_MIN_H, sh - y - STAGE_INSET),
    }
  }

  function centerTile() {
    const { w, h } = currentTileSize()
    if (!w || !h)
      return
    const { w: sw, h: sh } = stageSize()
    const b = moveBounds(w, h)
    tileX.value = snap(clamp(Math.round((sw - w) / 2), b.minX, b.maxX))
    tileY.value = snap(clamp(Math.round((sh - h) / 2), b.minY, b.maxY))
  }

  function clampPlacement() {
    if (tileW.value == null)
      return
    const { w, h } = currentTileSize()
    const b = moveBounds(w, h)
    if (tileX.value != null)
      tileX.value = clamp(tileX.value, b.minX, b.maxX)
    if (tileY.value != null)
      tileY.value = clamp(tileY.value, b.minY, b.maxY)
  }

  function pinFillAsTile(from?: DOMRect) {
    if (tileW.value != null && tileH.value != null)
      return
    const { w, h } = currentTileSize()
    tileW.value = Math.round(from?.width ?? w)
    tileH.value = Math.round(from?.height ?? h)
    tileX.value = STAGE_INSET
    tileY.value = STAGE_INSET
  }

  watch(() => toValue(kind), (next) => {
    if (!next)
      return
    const preset = PREVIEW_TILE_DEFAULT[next]
    tileW.value = preset?.w ?? null
    tileH.value = preset?.h ?? null
    userPlaced = false
    if (preset) {
      tileX.value = null
      tileY.value = null
      void nextTick(centerTile)
      return
    }
    tileX.value = STAGE_INSET
    tileY.value = STAGE_INSET
  }, { immediate: true })

  useResizeObserver(() => toValue(stage), () => {
    if (tileW.value == null)
      return
    if (userPlaced)
      clampPlacement()
    else
      centerTile()
  })

  function onTileDragStart(event: PointerEvent) {
    if (event.button !== 0)
      return
    event.preventDefault()
    event.stopPropagation()
    tileDragging.value = true
    const tileRect = tileHostOf(event)?.getBoundingClientRect()
    pinFillAsTile(tileRect)
    const startX = event.clientX
    const startY = event.clientY
    const startW = tileW.value ?? tileRect?.width ?? PREVIEW_TILE_DEFAULT.number.w
    const startH = tileH.value ?? tileRect?.height ?? PREVIEW_TILE_DEFAULT.number.h
    trackPointer(
      (next) => {
        const { maxW, maxH } = sizeBounds()
        tileW.value = snap(clamp(startW + next.clientX - startX, TILE_MIN_W, maxW))
        tileH.value = snap(clamp(startH + next.clientY - startY, TILE_MIN_H, maxH))
      },
      () => {
        tileDragging.value = false
      },
    )
  }

  function onTileMoveStart(event: PointerEvent) {
    if (event.button !== 0)
      return
    event.preventDefault()
    event.stopPropagation()
    const host = tileHostOf(event)
    pinFillAsTile(host?.getBoundingClientRect())
    if (tileX.value == null || tileY.value == null) {
      const stageEl = toValue(stage)
      const hr = host?.getBoundingClientRect()
      const sr = stageEl?.getBoundingClientRect()
      tileX.value = Math.round((hr?.left ?? 0) - (sr?.left ?? 0))
      tileY.value = Math.round((hr?.top ?? 0) - (sr?.top ?? 0))
    }
    userPlaced = true
    tileMoving.value = true
    const startX = event.clientX
    const startY = event.clientY
    const originX = tileX.value ?? STAGE_INSET
    const originY = tileY.value ?? STAGE_INSET
    const { w, h } = currentTileSize()
    trackPointer(
      (next) => {
        const b = moveBounds(w, h)
        tileX.value = snap(clamp(originX + next.clientX - startX, b.minX, b.maxX))
        tileY.value = snap(clamp(originY + next.clientY - startY, b.minY, b.maxY))
      },
      () => {
        tileMoving.value = false
      },
    )
  }

  const tileStyle = computed(() => {
    if (tileW.value == null) {
      return {
        width: `calc(100% - ${STAGE_INSET * 2}px)`,
        height: `calc(100% - ${STAGE_INSET * 2}px)`,
        left: `${STAGE_INSET}px`,
        top: `${STAGE_INSET}px`,
        transform: 'none',
      }
    }
    if (tileX.value == null || tileY.value == null) {
      return {
        width: `${tileW.value}px`,
        height: `${tileH.value}px`,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }
    return {
      width: `${tileW.value}px`,
      height: `${tileH.value}px`,
      left: `${tileX.value}px`,
      top: `${tileY.value}px`,
      transform: 'none',
    }
  })

  return { tileDragging, tileMoving, tileStyle, onTileDragStart, onTileMoveStart }
}
