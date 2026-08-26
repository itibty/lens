import type { MaybeRefOrGetter } from 'vue'
import type { VisVisualConfig } from './types'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { needsDataset } from './types'

export const AUTO_REFRESH_OPTIONS = [
  { value: 15, label: '15 秒' },
  { value: 30, label: '30 秒' },
  { value: 60, label: '1 分钟' },
  { value: 120, label: '2 分钟' },
  { value: 300, label: '5 分钟' },
  { value: 600, label: '10 分钟' },
] as const

export const DEFAULT_AUTO_REFRESH_SEC = 60

const ALLOWED = new Set<number>(AUTO_REFRESH_OPTIONS.map(item => item.value))

export function sanitizeAutoRefreshSec(raw: unknown): number | undefined {
  const sec = Math.round(Number(raw))
  return ALLOWED.has(sec) ? sec : undefined
}

/** 开启且类型可查数时返回秒数，否则 undefined */
export function resolveAutoRefreshSec(
  visual?: Pick<VisVisualConfig, 'autoRefreshSec' | 'chartType'>,
) {
  if (!needsDataset(visual?.chartType))
    return undefined
  return sanitizeAutoRefreshSec(visual?.autoRefreshSec)
}

export function pruneAutoRefresh(visual: VisVisualConfig) {
  const sec = resolveAutoRefreshSec(visual)
  if (sec)
    visual.autoRefreshSec = sec
  else
    delete visual.autoRefreshSec
}

/** 看板预览页按间隔静默重查；页签隐藏时暂停，回来补一次 */
export function useCardAutoRefresh(options: {
  intervalSec: MaybeRefOrGetter<number | undefined>
  enabled: MaybeRefOrGetter<boolean>
  run: () => void | Promise<void>
}) {
  const visibility = useDocumentVisibility()
  const intervalMs = computed(() => {
    const sec = toValue(options.intervalSec)
    return sec && sec > 0 ? sec * 1000 : 0
  })
  const active = computed(() =>
    intervalMs.value > 0 && toValue(options.enabled) && visibility.value === 'visible',
  )

  const timer = useIntervalFn(
    () => {
      void options.run()
    },
    intervalMs,
    { immediate: false },
  )

  watch(active, (on) => {
    if (on)
      timer.resume()
    else
      timer.pause()
  }, { immediate: true })

  watch(visibility, (state, prev) => {
    if (state === 'visible' && prev === 'hidden' && active.value)
      void options.run()
  })
}
