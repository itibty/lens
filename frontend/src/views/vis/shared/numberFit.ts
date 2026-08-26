import type { MaybeRefOrGetter } from 'vue'
import { useResizeObserver } from '@vueuse/core'
import { numberSizeOf } from './numberStyle'

/** 默认 4×5 格内容区高度；此时样式档原样生效 */
const FIT_REF_H = 128
const FIT_MIN = 0.7
/** 样式档是上限：格子变高不再把主值放到裁切 */
const FIT_MAX = 1
const FIT_EPS = 0.02

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/** 指标卡 / 趋势卡同一套：字号只跟高度走，只缩小、不放大。 */
export function numberFitScale(width: number, height: number) {
  if (width < 32 || height < 24)
    return 1
  return clamp(height / FIT_REF_H, FIT_MIN, FIT_MAX)
}

export function scaleNumberPx(px: number, scale: number) {
  return Math.round(px * scale * 10) / 10
}

export function scaleNumberSizeVars(size?: string, scale = 1) {
  const s = numberSizeOf(size)
  return {
    '--vis-number-gap': `${scaleNumberPx(s.gap, scale)}px`,
    '--vis-number-value': `${scaleNumberPx(s.value, scale)}px`,
    '--vis-number-aux': `${scaleNumberPx(s.aux, scale)}px`,
    '--vis-number-aux-label': `${scaleNumberPx(s.auxLabel, scale)}px`,
    '--vis-number-name': `${scaleNumberPx(s.labelSize, scale)}px`,
  }
}

export function useNumberFit(
  el: MaybeRefOrGetter<HTMLElement | null | undefined>,
  size: MaybeRefOrGetter<string | undefined>,
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
    const next = numberFitScale(rect.width, rect.height)
    if (Math.abs(next - scale.value) < FIT_EPS)
      return
    scale.value = next
  })

  watch(() => toValue(enabled), (on) => {
    if (!on)
      scale.value = 1
  })

  const vars = computed(() => scaleNumberSizeVars(toValue(size), scale.value))

  return { scale, vars }
}
