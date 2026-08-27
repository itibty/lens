import type { MaybeRefOrGetter } from 'vue'
import type { DashFilterOptionItem, DashFilterValues, VisDashFilterDef } from './dashApi'
import vis from '@/apis/vis/index'
import { isRemoteFilterOptions, resolveManualOptions } from './dashApi'

export const FILTER_OPTIONS_LIMIT = 50

export function parseFilterOptionsRes(res: VIS.RVisFilterOptionsResponse | undefined) {
  const payload = res?.data
  const list = (payload?.list ?? []).map(item => ({
    label: item.label || String(item.value ?? ''),
    value: String(item.value ?? ''),
  }))
  return {
    list,
    truncated: Boolean(payload?.truncated),
  }
}

export function filterOptionsErrorMessage(err: unknown) {
  if (err && typeof err === 'object' && 'msg' in err) {
    const msg = String((err as { msg?: unknown }).msg ?? '').trim()
    if (msg)
      return msg
  }
  return '预览失败'
}

export function optionValuesOf(values: unknown[] | undefined) {
  const seen = new Set<string>()
  const list: string[] = []
  for (const raw of values ?? []) {
    const value = String(raw ?? '').trim()
    if (!value || seen.has(value))
      continue
    seen.add(value)
    list.push(value)
  }
  return list
}

export function filterOptionsQuery(def: Pick<VisDashFilterDef, 'options'>) {
  const datasetId = String(def.options?.datasetId || '').trim()
  const field = String(def.options?.field || '').trim()
  if (!datasetId || !field)
    return null
  return {
    datasetId,
    field,
    ...(def.options?.labelField ? { labelField: def.options.labelField } : {}),
  }
}

function optionSourceKey(def: VisDashFilterDef, dashboardId = '') {
  const query = filterOptionsQuery(def)
  if (!query)
    return def.uid
  return [dashboardId, def.uid, query.datasetId, query.field, query.labelField || ''].join('\u0001')
}

async function requestFilterOptions(
  def: VisDashFilterDef,
  body: VIS.VisBoundFilterOptionsRequest,
  dashboardId = '',
) {
  const query = filterOptionsQuery(def)
  if (!query)
    return undefined
  const id = dashboardId.trim()
  if (id) {
    return vis.query.listDashboardFilterOptions({
      dashboardId: id,
      filterUid: def.uid,
    }, body)
  }
  return vis.query.listFilterOptions({ ...query, ...body })
}

export async function resolveOptionLabels(
  def: VisDashFilterDef,
  values: unknown[],
  dashboardId = '',
) {
  if (!filterOptionsQuery(def) || !isRemoteFilterOptions(def))
    return [] as DashFilterOptionItem[]
  const cleaned = optionValuesOf(values)
  if (!cleaned.length)
    return []
  const res = await requestFilterOptions(def, {
    values: cleaned,
  }, dashboardId)
  return parseFilterOptionsRes(res).list
}

export function useDashFilterLabels(
  defs: MaybeRefOrGetter<VisDashFilterDef[]>,
  values: MaybeRefOrGetter<DashFilterValues>,
  dashboardId?: MaybeRefOrGetter<string | undefined>,
) {
  const labels = ref<Record<string, Record<string, string>>>({})
  let seq = 0

  function labelsOf(uid: string) {
    const def = toValue(defs).find(item => item.uid === uid)
    if (!def)
      return {}
    return labels.value[optionSourceKey(def, toValue(dashboardId) || '')] || {}
  }

  watch(
    () => toValue(defs).map((def) => {
      if (!isRemoteFilterOptions(def))
        return def.uid
      const cells = optionValuesOf(toValue(values)[def.uid]?.value).join('\u0001')
      return `${optionSourceKey(def, toValue(dashboardId) || '')}\u0002${cells}`
    }).join('\u0003'),
    async () => {
      const id = ++seq
      const list = toValue(defs)
      const current = toValue(values)
      const next: Record<string, Record<string, string>> = {}
      await Promise.all(list.map(async (def) => {
        if (!isRemoteFilterOptions(def))
          return
        const currentDashboardId = toValue(dashboardId) || ''
        const key = optionSourceKey(def, currentDashboardId)
        const cells = optionValuesOf(current[def.uid]?.value)
        const known = labels.value[key] || {}
        if (!cells.length) {
          next[key] = {}
          return
        }
        const missing = cells.filter(item => !known[item])
        if (!missing.length) {
          next[key] = known
          return
        }
        try {
          const items = await resolveOptionLabels(def, missing, currentDashboardId)
          if (id !== seq)
            return
          const map = { ...known }
          for (const item of items)
            map[item.value] = item.label
          next[key] = map
        }
        catch {
          next[key] = known
        }
      }))
      if (id === seq)
        labels.value = next
    },
    { immediate: true },
  )

  return { labels, labelsOf }
}

/** 单选 / 多选：手工本地过滤，数据集远程搜。 */
export function useDashFilterOptions(
  def: MaybeRefOrGetter<VisDashFilterDef>,
  selected?: MaybeRefOrGetter<unknown[]>,
  dashboardId?: MaybeRefOrGetter<string | undefined>,
) {
  const options = ref<DashFilterOptionItem[]>([])
  const loading = ref(false)
  const truncated = ref(false)
  let seq = 0
  let pendingKey = ''
  let loadedKey = ''
  let hydratedKey = ''

  const current = computed(() => toValue(def))
  const isRemote = computed(() => isRemoteFilterOptions(current.value))
  const selectedValues = computed(() => optionValuesOf(selected ? toValue(selected) : []))

  function optionQueryKey(keyword = '') {
    const query = filterOptionsQuery(current.value)
    return [
      toValue(dashboardId) || '',
      current.value.uid,
      query?.datasetId || '',
      query?.field || '',
      query?.labelField || '',
      keyword.trim(),
    ].join('\u0001')
  }

  function resetRemoteCache() {
    seq += 1
    pendingKey = ''
    loadedKey = ''
    hydratedKey = ''
    loading.value = false
    options.value = []
    truncated.value = false
  }

  function applyManual(keyword = '') {
    const q = keyword.trim().toLowerCase()
    const all = resolveManualOptions(current.value.options)
    options.value = q
      ? all.filter(item => item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q))
      : all
    truncated.value = false
  }

  async function search(keyword = '') {
    if (!isRemote.value) {
      applyManual(keyword)
      return
    }
    const query = filterOptionsQuery(current.value)
    if (!query)
      return
    const reqKey = optionQueryKey(keyword)
    if (pendingKey === reqKey || loadedKey === reqKey)
      return
    const id = ++seq
    pendingKey = reqKey
    loading.value = true
    try {
      const res = await requestFilterOptions(current.value, {
        ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
        limit: FILTER_OPTIONS_LIMIT,
      }, toValue(dashboardId) || '')
      if (id !== seq)
        return
      const parsed = parseFilterOptionsRes(res)
      options.value = parsed.list
      truncated.value = parsed.truncated
      loadedKey = reqKey
      mergeSelected(selectedValues.value)
      void hydrateSelected(selectedValues.value)
    }
    catch {
      // 全局拦截器已提示
    }
    finally {
      if (id === seq) {
        pendingKey = ''
        loading.value = false
      }
    }
  }

  function mergeSelected(values: unknown[]) {
    const have = new Set(options.value.map(item => item.value))
    const manual = resolveManualOptions(current.value.options)
    const extra: DashFilterOptionItem[] = []
    for (const value of optionValuesOf(values)) {
      if (have.has(value))
        continue
      extra.push(manual.find(item => item.value === value) || { label: value, value })
      have.add(value)
    }
    if (extra.length)
      options.value = [...extra, ...options.value]
  }

  async function hydrateSelected(values: unknown[]) {
    if (!isRemote.value)
      return
    const cleaned = optionValuesOf(values)
    if (!cleaned.length)
      return
    const key = optionQueryKey(`#${cleaned.join('\u0001')}`)
    if (hydratedKey === key)
      return
    const ticket = seq
    try {
      const items = await resolveOptionLabels(current.value, cleaned, toValue(dashboardId) || '')
      if (ticket !== seq || optionQueryKey(`#${selectedValues.value.join('\u0001')}`) !== key)
        return
      hydratedKey = key
      if (!items.length)
        return
      const byValue = new Map(options.value.map(item => [item.value, item]))
      for (const item of items)
        byValue.set(item.value, item)
      options.value = [...byValue.values()]
    }
    catch {
      // 下次打开下拉再试
    }
  }

  watch(
    () => {
      if (!isRemote.value)
        return `local:${current.value.uid}:${current.value.options?.source || 'manual'}`
      const query = filterOptionsQuery(current.value)
      return [
        toValue(dashboardId) || '',
        current.value.uid,
        query?.datasetId,
        query?.field,
        query?.labelField || '',
      ].join('\u0001')
    },
    () => {
      resetRemoteCache()
      if (!isRemote.value)
        applyManual('')
    },
    { immediate: true },
  )

  return { options, loading, truncated, isRemote, search, mergeSelected, hydrateSelected }
}
