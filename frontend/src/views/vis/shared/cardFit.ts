import type { MaybeRefOrGetter } from 'vue'
import { useResizeObserver } from '@vueuse/core'

/** 默认 4×5 格内容区；此时字号 / 间距 / 图形为设计基准（scale = 1） */
export const CARD_FIT_REF_W = 216
export const CARD_FIT_REF_H = 128
export const CARD_FIT_MIN = 0.7
/** 全屏卡不至于字号失控 */
export const CARD_FIT_MAX = 2.8
export const CARD_FIT_EPS = 0.02

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export function scaleFitPx(px: number, scale: number) {
  return Math.round(px * scale * 10) / 10
}

/** 指标 / 进度 / 趋势同一套：随格子放大或缩小 */
export function cardFitScale(width: number, height: number) {
  if (width < 32 || height < 24)
    return 1
  return clamp(
    Math.min(width / CARD_FIT_REF_W, height / CARD_FIT_REF_H),
    CARD_FIT_MIN,
    CARD_FIT_MAX,
  )
}

export function useCardFitScale(
  el: MaybeRefOrGetter<HTMLElement | null | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const scale = ref(1)

  useResizeObserver(el, (entries) => {
    if (!toValue(enabled)) {
      scale.value = 1
      return
    }
    const rect = entries[0]?.contentRect
    if (!rect)
      return
    const next = cardFitScale(rect.width, rect.height)
    if (Math.abs(next - scale.value) < CARD_FIT_EPS)
      return
    scale.value = next
  })

  watch(() => toValue(enabled), (on) => {
    if (!on)
      scale.value = 1
  })

  return scale
}
