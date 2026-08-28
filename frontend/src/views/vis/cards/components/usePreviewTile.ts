import type { MaybeRefOrGetter } from 'vue'
import { isNumberChart, isTrendChart } from '@/views/vis/shared/types'

/** 数值类卡片使用接近看板的默认尺寸，其余类型默认铺满预览区 */
export const PREVIEW_TILE_DEFAULT = {
  number: { w: 240, h: 188 },
  trend: { w: 320, h: 268 },
  fill: null,
} as const

const TILE_MIN_W = 168
const TILE_MIN_H = 140

export type PreviewTileKind = keyof typeof PREVIEW_TILE_DEFAULT

export function previewTileKind(chartType?: string): PreviewTileKind | null {
  if (isTrendChart(chartType))
    return 'trend'
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
