import type { MaybeRefOrGetter } from 'vue'
import { scaleFitPx, useCardFitScale } from './cardFit'
import { NUMBER_TYPE } from './numberStyle'

export { scaleFitPx as scaleNumberPx } from './cardFit'

export function scaleNumberSizeVars(scale = 1) {
  return {
    '--vis-number-gap': `${scaleFitPx(NUMBER_TYPE.gap, scale)}px`,
    '--vis-number-value': `${scaleFitPx(NUMBER_TYPE.value, scale)}px`,
    '--vis-number-aux': `${scaleFitPx(NUMBER_TYPE.aux, scale)}px`,
    '--vis-number-aux-label': `${scaleFitPx(NUMBER_TYPE.auxLabel, scale)}px`,
    '--vis-number-name': `${scaleFitPx(NUMBER_TYPE.labelSize, scale)}px`,
  }
}

export function useNumberFit(
  el: MaybeRefOrGetter<HTMLElement | null | undefined>,
  enabled: MaybeRefOrGetter<boolean> = true,
) {
  const scale = useCardFitScale(el, enabled)
  const vars = computed(() => scaleNumberSizeVars(scale.value))
  return { scale, vars }
}
