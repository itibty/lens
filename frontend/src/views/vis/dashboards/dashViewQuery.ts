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
    throw new Error('链接中的筛选设置无效')
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

export interface DashboardViewContext {
  selectedId: string
  dirty: boolean
  linked: boolean
}

/** 分享的是当前查看内容，不携带仅属于自己的视图 ID。 */
export function buildDashboardViewLink(href: string, stateJson: string, bindingsJson: string) {
  const url = new URL(href)
  const encoded = o2s({ state: JSON.parse(stateJson), filterBindings: JSON.parse(bindingsJson) })
  if (!encoded)
    throw new Error('无法生成视图链接')
  url.searchParams.set('vs', decodeURIComponent(encoded))
  for (const key of ['f', 'viewId', 'view', 'subscriptionRunId', 'subscriptionScreenshot'])
    url.searchParams.delete(key)
  return url
}

export function syncViewQuery(stateJson: string, bindingsJson: string, context: DashboardViewContext) {
  const url = new URL(window.location.href)
  if (url.searchParams.has('subscriptionRunId'))
    return
  const previous = url.href
  url.searchParams.delete('f')
  url.searchParams.delete('viewId')
  url.searchParams.delete('view')
  url.searchParams.delete('vs')
  if (context.dirty || context.linked)
    url.searchParams.set('vs', buildDashboardViewLink(url.href, stateJson, bindingsJson).searchParams.get('vs')!)
  if (context.selectedId)
    url.searchParams.set('viewId', context.selectedId)
  else if (!context.dirty && !context.linked)
    url.searchParams.set('view', 'default')
  if (url.href !== previous)
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export function useDashViewUrl(stateJson: Ref<string>, bindingsJson: Ref<string>, context: Ref<DashboardViewContext>) {
  const enabled = ref(false)
  const sync = () => {
    if (enabled.value)
      syncViewQuery(stateJson.value, bindingsJson.value, context.value)
  }
  watch([stateJson, bindingsJson, context, enabled], sync)
  return {
    pause: () => enabled.value = false,
    resume: () => {
      enabled.value = true
      sync()
    },
  }
}
