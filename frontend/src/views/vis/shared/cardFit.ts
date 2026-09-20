import type { MaybeRefOrGetter } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { ref, watch } from 'vue'

/** 默认 4×5 格内容区；此时字号 / 间距 / 图形为设计基准（scale = 1） */
export const CARD_FIT_REF_W = 216
export const CARD_FIT_REF_H = 128
/** 相近尺寸共用档位；保留小卡与全屏卡原有的缩放范围。 */
export const CARD_FIT_LEVELS = [0.7, 0.8, 1, 1.25, 1.5, 2, 2.5, 2.8] as const
/** 放大时多留 4px 再升档；缩小时立即退档，避免边界反复跳动。 */
const GROW_BUFFER_PX = 4

export function scaleFitPx(px: number, scale: number) {
  return Math.round(px * scale)
}

/** 内容区已经扣除卡片标题和外边距；按宽高同时容纳的最大档位展示。 */
export function cardFitScale(width: number, height: number, previousScale?: number) {
  if (width < 32 || height < 24)
    return 1
  return CARD_FIT_LEVELS.findLast((level) => {
    const buffer = previousScale != null && level > previousScale ? GROW_BUFFER_PX : 0
    return width >= CARD_FIT_REF_W * level + buffer
      && height >= CARD_FIT_REF_H * level + buffer
  }) ?? CARD_FIT_LEVELS[0]
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
    scale.value = cardFitScale(rect.width, rect.height, scale.value)
  })

  watch(() => toValue(enabled), (on) => {
    if (!on)
      scale.value = 1
  })

  return scale
}
