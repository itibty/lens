/**
 * 看板预览页筛选 ↔ URL：o2s / s2o 编解码。
 * 只认当前筛选定义里的 uid；对不上或值不合法的忽略。
 * 改地址栏用 history.replaceState，不走 Vue Router。
 */
import type { MaybeRefOrGetter, Ref } from 'vue'
import type { LocationQuery } from 'vue-router'
import type { DashFilterValues, VisDashFilterDef } from './dashApi'
import { o2s, s2o } from '@/utils'
import {
  applyFilterDefaults,
  filterValueReady,
  isBlankFilterValue,
  snapshotFilterValue,
} from './dashApi'

export const DASH_FILTER_QUERY_KEY = 'f'

function queryText(query: LocationQuery, key: string) {
  const raw = query[key]
  const text = Array.isArray(raw) ? raw[0] : raw
  return typeof text === 'string' && text ? text : undefined
}

function readFilterBag(query: LocationQuery): Record<string, unknown> | null {
  const text = queryText(query, DASH_FILTER_QUERY_KEY)
  if (!text)
    return null
  const parsed = s2o(text)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    return null
  return parsed as Record<string, unknown>
}

/** 默认值打底，再用 URL 里能对上且合法的项覆盖（含显式清空） */
export function applyFiltersFromQuery(
  defs: VisDashFilterDef[],
  query: LocationQuery,
): DashFilterValues {
  const next = applyFilterDefaults(defs, {})
  const bag = readFilterBag(query)
  if (!bag)
    return next
  for (const def of defs) {
    if (!(def.uid in bag))
      continue
    const snap = snapshotFilterValue(bag[def.uid] as DashFilterValues[string])
    if (isBlankFilterValue(snap) || filterValueReady(def, snap))
      next[def.uid] = snap
  }
  return next
}

export function encodeFilterQuery(
  defs: VisDashFilterDef[],
  values: DashFilterValues,
) {
  if (!defs.length)
    return undefined
  const payload: DashFilterValues = {}
  for (const def of defs)
    payload[def.uid] = snapshotFilterValue(values[def.uid])
  return o2s(payload) || undefined
}

function decodeQueryValue(encoded?: string) {
  if (!encoded)
    return undefined
  try {
    return decodeURIComponent(encoded)
  }
  catch {
    return encoded
  }
}

/** 只改地址栏，不堆历史、不触发路由守卫。 */
export function syncFilterQuery(encoded?: string) {
  const url = new URL(window.location.href)
  const next = decodeQueryValue(encoded)
  const current = url.searchParams.get(DASH_FILTER_QUERY_KEY) || undefined
  if (current === next)
    return
  if (next)
    url.searchParams.set(DASH_FILTER_QUERY_KEY, next)
  else
    url.searchParams.delete(DASH_FILTER_QUERY_KEY)
  try {
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    )
  }
  catch {
    // replaceState 失败时不要退回 location.replace，避免整页重载
  }
}

/** 预览页：载入时从 query 还原，之后筛选变化只改地址栏 */
export function useDashFilterUrl(
  defs: Ref<VisDashFilterDef[]>,
  values: Ref<DashFilterValues>,
  enabled: MaybeRefOrGetter<boolean>,
) {
  const ready = ref(false)

  function pauseFilterUrl() {
    ready.value = false
  }

  function applyFilterQuery(query: LocationQuery) {
    ready.value = false
    values.value = toValue(enabled)
      ? applyFiltersFromQuery(defs.value, query)
      : {}
    ready.value = toValue(enabled)
  }

  watch(
    [values, ready],
    () => {
      if (!ready.value || !toValue(enabled))
        return
      syncFilterQuery(encodeFilterQuery(defs.value, values.value))
    },
    { deep: true },
  )

  return { pauseFilterUrl, applyFilterQuery }
}
