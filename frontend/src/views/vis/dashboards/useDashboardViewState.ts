import type { Ref } from 'vue'
import type { LocationQuery } from 'vue-router'
import type { DashFilterValues, VisDashFilterDef } from './dashApi'
import type { DashTabValues } from './dashboardViewState'
import type { DashWidget } from './dashLayout'
import { computed, onScopeDispose, ref } from 'vue'
import { getSubscriptionRunView } from '@/apis/vis/dashboardSubscription'
import * as api from '@/apis/vis/personalReport'
import { showToast } from '@/utils'
import { apiErrorMessage } from '@/views/vis/shared/visRequest'
import { captureViewState, parseViewState, resolveTabValues } from './dashboardViewState'
import { explicitViewRequest } from './dashViewQuery'

export function useDashboardViewState(defs: Ref<VisDashFilterDef[]>, values: Ref<DashFilterValues>, widgets: Ref<DashWidget[]> = ref([])) {
  const dashboardId = ref('')
  const preference = ref<VIS.PersonalReportInfo>({})
  const views = ref<VIS.PersonalViewInfo[]>([])
  const selectedId = ref('')
  const linked = ref(false)
  const summary = ref('')
  const runDate = ref('')
  const error = ref('')
  const ready = ref(false)
  const busy = ref(false)
  const baseline = ref('')
  const tabs = ref<DashTabValues>({})
  const bindingsJson = ref('{}')
  let session = 0
  const stateJson = computed(() => JSON.stringify(captureViewState(defs.value, values.value, resolveTabValues(widgets.value, tabs.value))))
  const dirty = computed(() => ready.value && stateJson.value !== baseline.value)
  const selected = computed(() => views.value.find(view => view.id === selectedId.value))
  const options = { showErrorMessage: false }

  function apply(result: VIS.ResolvedView) {
    if (!result.stateJson)
      throw new Error('没有可恢复的查看状态')
    const state = parseViewState(result.stateJson)
    values.value = state.filters
    tabs.value = resolveTabValues(widgets.value, state.tabs)
    bindingsJson.value = result.bindingsJson || '{}'
    selectedId.value = result.viewId || ''
    linked.value = false
    summary.value = result.summary || ''
    runDate.value = result.asOfDate || ''
    baseline.value = stateJson.value
    ready.value = true
    error.value = ''
  }

  async function load(id: string, query: LocationQuery) {
    const current = ++session
    dashboardId.value = id
    ready.value = false
    busy.value = true
    error.value = ''
    selectedId.value = ''
    linked.value = false
    summary.value = ''
    runDate.value = ''
    views.value = []
    preference.value = {}
    const queryString = (key: string) => typeof query[key] === 'string' ? query[key] as string : ''
    try {
      let response: { data?: VIS.ResolvedView }
      if (queryString('subscriptionRunId')) {
        response = await getSubscriptionRunView({ dashboardId: id, runId: queryString('subscriptionRunId') }, options)
      }
      else {
        const [pref, list] = await Promise.all([
          api.getReportPreference({ dashboardId: id }, options),
          api.listPersonalViews({ dashboardId: id }, options),
        ])
        if (current !== session)
          return
        preference.value = pref.data || {}
        views.value = list.data?.list || []
        const request: VIS.ResolveViewRequest = { dashboardId: id }
        const explicit = explicitViewRequest(query)
        if (explicit) {
          Object.assign(request, explicit)
        }
        else if (queryString('viewId')) {
          request.viewId = queryString('viewId')
        }
        else if (preference.value.defaultViewId) {
          request.viewId = preference.value.defaultViewId
        }
        response = await api.resolvePersonalView(request, options)
      }
      if (current !== session)
        return
      apply(response.data || {})
      linked.value = !queryString('subscriptionRunId') && !!(queryString('vs') || queryString('f'))
      if (queryString('subscriptionScreenshot') !== '1')
        void api.recordReportVisit({ dashboardId: id }, options).catch(() => {})
    }
    catch (e) {
      if (current === session)
        error.value = apiErrorMessage(e, '查看状态加载失败')
    }
    finally {
      if (current === session)
        busy.value = false
    }
  }

  function clearExplicitContext() {
    const url = new URL(window.location.href)
    url.searchParams.delete('subscriptionRunId')
    url.searchParams.delete('viewId')
    window.history.replaceState(window.history.state, '', url)
  }

  async function action(run: (current: () => boolean) => Promise<void>) {
    if (busy.value)
      return
    busy.value = true
    error.value = ''
    const currentSession = session
    try {
      await run(() => currentSession === session)
    }
    catch (e) {
      if (currentSession === session)
        error.value = apiErrorMessage(e, '操作失败')
    }
    finally {
      if (currentSession === session)
        busy.value = false
    }
  }

  async function choose(viewId = '') {
    await action(async (current) => {
      const result = await api.resolvePersonalView({ dashboardId: dashboardId.value, viewId: viewId || undefined }, options)
      if (current()) {
        clearExplicitContext()
        apply(result.data || {})
      }
    })
  }

  async function save(name: string, update = false) {
    const old = update ? selected.value : undefined
    await action(async (current) => {
      const id = dashboardId.value
      const saved = stateJson.value
      const result = await api.savePersonalView({
        dashboardId: id,
        viewName: name,
        stateJson: saved,
        bindingsJson: bindingsJson.value,
        id: old?.id,
        revision: old?.revision,
      }, options)
      const list = await api.listPersonalViews({ dashboardId: id }, options)
      if (current()) {
        views.value = list.data?.list || []
        selectedId.value = result.data || ''
        linked.value = false
        baseline.value = saved
        error.value = ''
        showToast('个人视图已保存')
      }
    })
  }

  async function rename(name: string) {
    const view = selected.value
    if (!view?.id || !view.stateJson)
      return
    await action(async (current) => {
      const id = dashboardId.value
      await api.savePersonalView({ dashboardId: id, id: view.id, revision: view.revision, stateJson: view.stateJson!, viewName: name }, options)
      const list = await api.listPersonalViews({ dashboardId: id }, options)
      if (current())
        views.value = list.data?.list || []
    })
  }

  async function remove() {
    const id = selectedId.value
    if (!id)
      return
    await action(async (current) => {
      await api.deletePersonalView({ viewId: id }, options)
      if (current()) {
        views.value = views.value.filter(view => view.id !== id)
        selectedId.value = ''
        if (preference.value.defaultViewId === id)
          preference.value.defaultViewId = undefined
        baseline.value = ''
      }
    })
  }

  async function setDefault(clear = false) {
    await action(async (current) => {
      const id = clear ? undefined : selectedId.value || undefined
      await api.setDefaultPersonalView({ dashboardId: dashboardId.value, defaultViewId: id }, options)
      if (current()) {
        preference.value.defaultViewId = id
        showToast(id ? '已设为个人默认视图' : '已恢复使用报表默认')
      }
    })
  }

  async function favorite() {
    await action(async (current) => {
      const next = !preference.value.favorite
      await api.setReportFavorite({ dashboardId: dashboardId.value, favorite: next }, options)
      if (current())
        preference.value.favorite = next
    })
  }

  onScopeDispose(() => session++)
  return { preference, views, selectedId, selected, linked, summary, runDate, ready, busy, error, dirty, stateJson, tabs, bindingsJson, load, choose, save, rename, remove, setDefault, favorite }
}
