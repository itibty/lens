import type { Ref } from 'vue'
import type { LocationQuery } from 'vue-router'
import { ref, watch } from 'vue'
import { o2s, s2o } from '@/utils'
import { parseViewState } from './dashboardViewState'

export function readViewQuery(encoded: string) {
  const payload = s2o(encoded)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !('state' in payload))
    throw new Error('链接中的视图无效')
  const stateJson = JSON.stringify(payload.state)
  parseViewState(stateJson)
  const bindings = 'filterBindings' in payload ? payload.filterBindings : {}
  if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings))
    throw new Error('链接中的筛选绑定无效')
  return { stateJson, bindingsJson: JSON.stringify(bindings) }
}

export function explicitViewRequest(query: LocationQuery): Pick<VIS.ResolveViewRequest, 'stateJson' | 'bindingsJson'> | undefined {
  if (typeof query.vs === 'string' && query.vs)
    return readViewQuery(query.vs)
  if (typeof query.f === 'string' && query.f) {
    const filters = s2o(query.f)
    if (!filters || typeof filters !== 'object' || Array.isArray(filters))
      throw new Error('链接中的筛选条件无效')
    return { stateJson: JSON.stringify({ schemaVersion: 1, filters }) }
  }
}

export function syncViewQuery(stateJson: string, bindingsJson: string) {
  const url = new URL(window.location.href)
  if (url.searchParams.has('subscriptionRunId'))
    return
  const encoded = o2s({ state: JSON.parse(stateJson), filterBindings: JSON.parse(bindingsJson) })
  if (!encoded)
    return
  const next = decodeURIComponent(encoded)
  if (url.searchParams.get('vs') === next && !url.searchParams.has('f') && !url.searchParams.has('viewId'))
    return
  url.searchParams.set('vs', next)
  url.searchParams.delete('f')
  url.searchParams.delete('viewId')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export function useDashViewUrl(stateJson: Ref<string>, bindingsJson: Ref<string>) {
  const enabled = ref(false)
  const sync = () => {
    if (enabled.value)
      syncViewQuery(stateJson.value, bindingsJson.value)
  }
  watch([stateJson, bindingsJson, enabled], sync)
  return {
    pause: () => enabled.value = false,
    resume: () => {
      enabled.value = true
      sync()
    },
  }
}
