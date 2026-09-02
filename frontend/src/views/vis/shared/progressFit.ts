import type { MaybeRefOrGetter } from 'vue'
import type { VisProgressShape } from './types'
import { scaleFitPx, useCardFitScale } from './cardFit'
import { PROGRESS_RING_PERCENT_RATIO, PROGRESS_RING_REF, progressRingGeom, progressSizeVars } from './progressCard'

const RING_MIN = 40

/** 把环形 / 大半环塞进剩余槽；按含圆角边距后的真实宽高比算 */
export function fitProgressRingBox(
  slotW: number,
  slotH: number,
  shape: VisProgressShape = 'ring',
) {
  if (slotW < 8 || slotH < 8)
    return 0
  const probe = progressRingGeom(shape)
  const ratioW = probe.width / probe.size
  const ratioH = probe.height / probe.size
  return Math.max(
    RING_MIN,
    Math.round(Math.min(slotW / ratioW, slotH / ratioH) * 0.96 * 10) / 10,
  )
}

export function scaleProgressRingPercent(ringSize?: number) {
  const box = ringSize && ringSize > 0 ? ringSize : PROGRESS_RING_REF
  return `${scaleFitPx(box * PROGRESS_RING_PERCENT_RATIO, 1)}px`
}

export function useProgressFit(
  el: MaybeRefOrGetter<HTMLElement | null | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const scale = useCardFitScale(el, enabled)
  const vars = computed(() => progressSizeVars(scale.value))
  return { scale, vars }
}
