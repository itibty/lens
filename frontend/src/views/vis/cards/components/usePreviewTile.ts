import type { MaybeRefOrGetter } from 'vue'
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

/** 设计页预览格：可拖，刷新回默认，不落 localStorage */
export function usePreviewTile(
  kind: MaybeRefOrGetter<PreviewTileKind | null>,
  stage: MaybeRefOrGetter<HTMLElement | null | undefined>,
) {
  const tileW = ref<number | null>(null)
  const tileH = ref<number | null>(null)
  const tileDragging = ref(false)

  watch(() => toValue(kind), (next) => {
    if (!next)
      return
    const preset = PREVIEW_TILE_DEFAULT[next]
    tileW.value = preset?.w ?? null
    tileH.value = preset?.h ?? null
  })

  function tileBounds() {
    const rect = toValue(stage)?.getBoundingClientRect()
    return {
      maxW: rect ? Math.max(TILE_MIN_W, Math.floor(rect.width - 8)) : 960,
      maxH: rect ? Math.max(TILE_MIN_H, Math.floor(rect.height - 8)) : 720,
    }
  }

  function onTileDragStart(event: PointerEvent) {
    if (event.button !== 0)
      return
    event.preventDefault()
    tileDragging.value = true
    const startX = event.clientX
    const startY = event.clientY
    const tileRect = (event.currentTarget as HTMLElement | null)?.parentElement?.getBoundingClientRect()
    const startW = tileW.value ?? tileRect?.width ?? PREVIEW_TILE_DEFAULT.number.w
    const startH = tileH.value ?? tileRect?.height ?? PREVIEW_TILE_DEFAULT.number.h

    const onMove = (next: PointerEvent) => {
      const { maxW, maxH } = tileBounds()
      tileW.value = Math.round(clamp(startW + next.clientX - startX, TILE_MIN_W, maxW))
      tileH.value = Math.round(clamp(startH + next.clientY - startY, TILE_MIN_H, maxH))
    }
    const onUp = () => {
      tileDragging.value = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const tileStyle = computed(() => ({
    width: tileW.value == null ? '100%' : `${tileW.value}px`,
    height: tileH.value == null ? '100%' : `${tileH.value}px`,
  }))

  return { tileDragging, tileStyle, onTileDragStart }
}
