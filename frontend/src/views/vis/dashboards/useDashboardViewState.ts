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
import { captureViewState, getDashboardViewCapabilities, parseViewState, resolveTabValues } from './dashboardViewState'
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
  const metadataNotice = ref('')
  const preferencesAvailable = ref(false)
  const viewsAvailable = ref(false)
  const ready = ref(false)
  const busy = ref(false)
  const baseline = ref('')
  const tabs = ref<DashTabValues>({})
  const bindingsJson = ref('{}')
  let session = 0
  const stateJson = computed(() => JSON.stringify(captureViewState(defs.value, values.value, resolveTabValues(widgets.value, tabs.value))))
  const dirty = computed(() => ready.value && stateJson.value !== baseline.value)
  const selected = computed(() => views.value.find(view => view.id === selectedId.value))
  const capabilities = computed(() => getDashboardViewCapabilities(defs.value, widgets.value))
  const urlContext = computed(() => ({ selectedId: selectedId.value, dirty: dirty.value, linked: linked.value }))
  const options = { showErrorMessage: false }

  function normalizedState(json: string) {
    const state = parseViewState(json)
    return JSON.stringify(captureViewState(defs.value, state.filters, resolveTabValues(widgets.value, state.tabs)))
  }

  function rememberView(result: VIS.ResolvedView) {
    if (!result.viewId)
      return
    const index = views.value.findIndex(view => view.id === result.viewId)
    const view = { id: result.viewId, viewName: result.viewName, stateJson: result.stateJson, revision: result.revision }
    if (index < 0)
      views.value.push(view)
    else
      views.value[index] = { ...views.value[index], ...view }
  }

  function apply(result: VIS.ResolvedView) {
    if (!result.stateJson)
      throw new Error('没有可恢复的查看状态')
    const state = parseViewState(result.stateJson)
    values.value = state.filters
    tabs.value = resolveTabValues(widgets.value, state.tabs)
    bindingsJson.value = result.bindingsJson || '{}'
    selectedId.value = result.viewId || ''
    rememberView(result)
    linked.value = false
    summary.value = result.summary || ''
    runDate.value = result.asOfDate || ''
    baseline.value = stateJson.value
    ready.value = true
    error.value = ''
  }

  async function loadMetadata(id: string, current: () => boolean) {
    const [pref, list] = await Promise.allSettled([
      api.getReportPreference({ dashboardId: id }, options),
      api.listPersonalViews({ dashboardId: id }, options),
    ])
    if (!current())
      return
    const previousView = selected.value
    preferencesAvailable.value = pref.status === 'fulfilled'
    viewsAvailable.value = list.status === 'fulfilled'
    if (pref.status === 'fulfilled')
      preference.value = pref.value.data || {}
    if (list.status === 'fulfilled') {
      views.value = list.value.data?.list || []
      if (previousView && !views.value.some(view => view.id === previousView.id)) {
        selectedId.value = ''
        linked.value = true
        baseline.value = stateJson.value
      }
    }
    metadataNotice.value = !preferencesAvailable.value
      ? '个人设置加载失败，请重试'
      : !viewsAvailable.value ? '视图列表加载失败，请重试' : ''
  }

  async function load(id: string, query: LocationQuery) {
    const current = ++session
    dashboardId.value = id
    ready.value = false
    busy.value = true
    error.value = ''
    metadataNotice.value = ''
    preferencesAvailable.value = false
    viewsAvailable.value = false
    selectedId.value = ''
    linked.value = false
    summary.value = ''
    runDate.value = ''
    views.value = []
    preference.value = {}
    const queryString = (key: string) => typeof query[key] === 'string' ? query[key] as string : ''
    try {
      let response: { data?: VIS.ResolvedView }
      let baseView: VIS.ResolvedView | undefined
      let explicitState = false
      if (queryString('subscriptionRunId')) {
        response = await getSubscriptionRunView({ dashboardId: id, runId: queryString('subscriptionRunId') }, options)
      }
      else {
        await loadMetadata(id, () => current === session)
        if (current !== session)
          return
        const request: VIS.ResolveViewRequest = { dashboardId: id }
        const explicit = explicitViewRequest(query)
        if (explicit) {
          explicitState = true
          Object.assign(request, explicit)
          // 同一用户刷新未保存的修改时，恢复所属视图及其比较基准。
          // 他人分享的链接只恢复筛选，不尝试读取对方的个人视图。
          if (views.value.some(view => view.id === queryString('viewId'))) {
            try {
              baseView = (await api.resolvePersonalView({ dashboardId: id, viewId: queryString('viewId') }, options)).data
            }
            catch {
              if (current === session)
                metadataNotice.value = '原视图加载失败，当前查看内容已保留'
            }
          }
        }
        else if (queryString('viewId')) {
          request.viewId = queryString('viewId')
        }
        else if (queryString('view') !== 'default' && preference.value.defaultViewId) {
          request.viewId = preference.value.defaultViewId
        }
        else if (!preferencesAvailable.value && queryString('view') !== 'default') {
          metadataNotice.value = '个人设置加载失败，已打开默认视图'
        }
        if (current !== session)
          return
        response = await api.resolvePersonalView(request, options)
      }
      if (current !== session)
        return
      apply(response.data || {})
      linked.value = explicitState
      if (baseView?.viewId && baseView.stateJson) {
        rememberView(baseView)
        selectedId.value = baseView.viewId
        baseline.value = normalizedState(baseView.stateJson)
        linked.value = false
      }
      if (queryString('subscriptionScreenshot') !== '1')
        void api.recordReportVisit({ dashboardId: id }, options).catch(() => {})
    }
    catch (e) {
      if (current === session)
        error.value = apiErrorMessage(e, '视图加载失败，请重试')
    }
    finally {
      if (current === session)
        busy.value = false
    }
  }

  function clearExplicitContext(viewId?: string) {
    const url = new URL(window.location.href)
    url.searchParams.delete('subscriptionRunId')
    url.searchParams.delete('viewId')
    url.searchParams.delete('vs')
    url.searchParams.delete('f')
    url.searchParams.delete('view')
    if (viewId)
      url.searchParams.set('viewId', viewId)
    else
      url.searchParams.set('view', 'default')
    window.history.replaceState(window.history.state, '', url)
  }

  async function retryMetadata() {
    if (busy.value)
      return
    busy.value = true
    const current = session
    try {
      await loadMetadata(dashboardId.value, () => current === session)
    }
    finally {
      if (current === session)
        busy.value = false
    }
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
      if (!preferencesAvailable.value || !viewsAvailable.value)
        await loadMetadata(dashboardId.value, current)
      if (!current())
        return
      const result = await api.resolvePersonalView({ dashboardId: dashboardId.value, viewId: viewId || undefined }, options)
      if (current()) {
        apply(result.data || {})
        clearExplicitContext(result.data?.viewId)
      }
    })
  }

  async function save(name: string, update = false) {
    if (!capabilities.value.canCustomize || !viewsAvailable.value)
      return
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
        showToast(update ? '更改已保存' : '视图已保存')
      }
    })
  }

  async function rename(name: string, viewId = selectedId.value) {
    const view = views.value.find(view => view.id === viewId)
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

  async function remove(id = selectedId.value) {
    if (!id)
      return
    await action(async (current) => {
      await api.deletePersonalView({ viewId: id }, options)
      if (current()) {
        views.value = views.value.filter(view => view.id !== id)
        if (selectedId.value === id) {
          selectedId.value = ''
          linked.value = true
          baseline.value = stateJson.value
        }
        if (preference.value.defaultViewId === id)
          preference.value.defaultViewId = undefined
        showToast('视图已删除')
      }
    })
  }

  async function setDefault(clear = false, viewId = selectedId.value) {
    await action(async (current) => {
      const id = clear ? undefined : viewId || undefined
      await api.setDefaultPersonalView({ dashboardId: dashboardId.value, defaultViewId: id }, options)
      if (current()) {
        preference.value.defaultViewId = id
        showToast(id ? '下次打开看板时将使用此视图' : '已取消默认打开')
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
  return { preference, views, selectedId, selected, linked, summary, runDate, ready, busy, error, metadataNotice, preferencesAvailable, viewsAvailable, capabilities, dirty, stateJson, urlContext, tabs, bindingsJson, load, retryMetadata, choose, save, rename, remove, setDefault, favorite }
}
