import type { DashFilterValues, VisDashFilterDef } from './dashApi'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { getSubscriptionRunView } from '@/apis/vis/dashboardSubscription'
import * as api from '@/apis/vis/personalReport'
import { createEmptyGroup } from './dashLayout'
import { useDashboardViewState } from './useDashboardViewState'

vi.mock('@/apis/vis/personalReport', () => ({
  getReportPreference: vi.fn(),
  listPersonalViews: vi.fn(),
  resolvePersonalView: vi.fn(),
  recordReportVisit: vi.fn(),
  savePersonalView: vi.fn(),
  deletePersonalView: vi.fn(),
  setDefaultPersonalView: vi.fn(),
}))
vi.mock('@/apis/vis/dashboardSubscription', () => ({ getSubscriptionRunView: vi.fn() }))
vi.mock('@/utils', () => ({ s2o: (text: string) => JSON.parse(text), showToast: vi.fn() }))
vi.mock('./dashboardRepository', () => ({}))
const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  scopes.splice(0).forEach(scope => scope.stop())
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})
function setup(withTabs = false) {
  const defs = ref<VisDashFilterDef[]>([{ uid: 'region', datasetId: '1', field: 'region', label: '地区', formType: 'select', applyAs: 'filter' }])
  const values = ref<DashFilterValues>({})
  const scope = effectScope()
  scopes.push(scope)
  const widgets = ref(withTabs
    ? [{ ...createEmptyGroup(), id: 'g', mode: 'tabs' as const, pages: ['1', '2'].map(cardId => ({ id: `page-${cardId}`, items: [{ cardId, x: 0, y: 0, w: 12, h: 8 }] })) }]
    : [])
  const state = scope.run(() => useDashboardViewState(defs, values, widgets))!
  vi.mocked(api.getReportPreference).mockResolvedValue({ code: 200, msg: '成功', data: { defaultViewId: 'default' } })
  vi.mocked(api.listPersonalViews).mockResolvedValue({ code: 200, msg: '成功', data: { list: [] } })
  vi.mocked(api.recordReportVisit).mockResolvedValue({ code: 200, msg: '成功' })
  vi.mocked(api.resolvePersonalView).mockResolvedValue({ code: 200, msg: '成功', data: { stateJson: '{"schemaVersion":1,"filters":{"region":{"value":[]}}}' } })
  return { state, values, defs, widgets }
}

describe('restore personal report state before querying', () => {
  it('uses explicit URL filters before personal default and preserves empty selection', async () => {
    const { state, values } = setup()
    await state.load('10', { f: '{"region":{"value":[]}}', viewId: 'explicit' })
    expect(api.resolvePersonalView).toHaveBeenCalledWith({ dashboardId: '10', stateJson: '{"schemaVersion":1,"filters":{"region":{"value":[]}}}' }, expect.anything())
    expect(values.value.region?.value).toEqual([])
    expect(state.ready.value).toBe(true)
    expect(state.dirty.value).toBe(false)
    values.value.region = { value: ['华南'] }
    expect(state.dirty.value).toBe(true)
  })

  it('restores subscription snapshot ahead of every other source and does not count screenshot visits', async () => {
    const { state } = setup()
    vi.mocked(getSubscriptionRunView).mockResolvedValue({ code: 200, msg: '成功', data: { stateJson: '{"schemaVersion":1,"filters":{}}', asOfDate: '2026-09-01' } })
    await state.load('10', { subscriptionRunId: '20', subscriptionScreenshot: '1', viewId: 'explicit', f: 'broken' })
    expect(state.runDate.value).toBe('2026-09-01')
    expect(api.getReportPreference).not.toHaveBeenCalled()
    expect(api.recordReportVisit).not.toHaveBeenCalled()
  })

  it('keeps real API failures visible instead of treating them as missing settings', async () => {
    const { state } = setup()
    vi.mocked(api.resolvePersonalView).mockRejectedValue({ msg: '服务暂不可用' })
    await state.load('10', {})
    expect(state.ready.value).toBe(false)
    expect(state.error.value).toBe('服务暂不可用')
    expect(api.resolvePersonalView).toHaveBeenCalledTimes(1)
  })
  it('restores complete URL state before defaults and saves changed tabs with bindings', async () => {
    const { state } = setup(true)
    const stateJson = '{"schemaVersion":2,"filters":{"region":{"value":[]}},"tabs":{"g":{"activeCardId":"2"}}}'
    vi.mocked(api.resolvePersonalView).mockResolvedValue({ code: 200, msg: '成功', data: { stateJson, bindingsJson: '{"region":{"field":"region"}}' } })
    await state.load('10', { vs: JSON.stringify({ state: JSON.parse(stateJson), filterBindings: {} }), f: 'broken' })
    expect(api.resolvePersonalView).toHaveBeenCalledWith({ dashboardId: '10', stateJson, bindingsJson: '{}' }, expect.anything())
    expect(state.tabs.value.g?.activeCardId).toBe('2')
    expect(state.dirty.value).toBe(false)
    state.tabs.value.g = { activeCardId: '1' }
    expect(state.dirty.value).toBe(true)
    vi.mocked(api.savePersonalView).mockResolvedValue({ code: 200, msg: '成功', data: 'saved' })
    await state.save('经营')
    expect(api.savePersonalView).toHaveBeenCalledWith(expect.objectContaining({
      viewName: '经营',
      bindingsJson: '{"region":{"field":"region"}}',
      stateJson: '{"schemaVersion":2,"filters":{"region":{"value":[]}},"tabs":{"g":{"activeCardId":"1"}}}',
    }), expect.anything())
    expect(state.dirty.value).toBe(false)
  })

  it('uses defaults for legacy and missing tabs without marking a restored view dirty', async () => {
    const { state } = setup(true)
    await state.load('10', {})
    expect(state.tabs.value.g?.activeCardId).toBe('1')
    expect(state.dirty.value).toBe(false)
    vi.mocked(api.resolvePersonalView).mockResolvedValue({ code: 200, msg: '成功', data: { stateJson: '{"schemaVersion":2,"filters":{},"tabs":{"g":{"activeCardId":"deleted"}}}' } })
    await state.load('10', {})
    expect(state.tabs.value.g?.activeCardId).toBe('1')
    expect(state.dirty.value).toBe(false)
  })
  it('clears old link state and explicitly selects dashboard defaults even when state is unchanged', async () => {
    const { state } = setup(true)
    await state.load('10', {})
    const replaceState = vi.fn()
    vi.stubGlobal('window', { location: { href: 'http://localhost/vis/report/10?vs=current&viewId=old' }, history: { state: {}, replaceState } })
    await state.choose('')
    const url = replaceState.mock.calls[0]![2] as URL
    expect(url.searchParams.has('vs')).toBe(false)
    expect(url.searchParams.has('viewId')).toBe(false)
    expect(url.searchParams.get('view')).toBe('default')
    expect(state.dirty.value).toBe(false)
  })

  it('keeps the saved view and dirty baseline when reloading its draft URL', async () => {
    const { state, values } = setup()
    const original = '{"schemaVersion":2,"filters":{"region":{"value":["华东"]}},"tabs":{}}'
    const draft = '{"schemaVersion":2,"filters":{"region":{"value":["华南"]}},"tabs":{}}'
    vi.mocked(api.listPersonalViews).mockResolvedValue({ code: 200, msg: '成功', data: { list: [{ id: 'mine', viewName: '华东销售', stateJson: original, revision: 2 }] } })
    vi.mocked(api.resolvePersonalView).mockImplementation(async request => ({ code: 200, msg: '成功', data: request.viewId
      ? { viewId: 'mine', viewName: '华东销售', revision: 2, stateJson: original }
      : { stateJson: draft } }))
    await state.load('10', { viewId: 'mine', vs: JSON.stringify({ state: JSON.parse(draft) }) })
    expect(state.selected.value?.viewName).toBe('华东销售')
    expect(values.value.region?.value).toEqual(['华南'])
    expect(state.dirty.value).toBe(true)
    expect(state.linked.value).toBe(false)
    values.value.region = { value: ['华东'] }
    expect(state.dirty.value).toBe(false)
  })

  it('treats another user’s view ID as context only when explicit state is provided', async () => {
    const { state } = setup()
    await state.load('10', { viewId: 'someone-else', vs: '{"state":{"schemaVersion":2,"filters":{},"tabs":{}}}' })
    expect(api.resolvePersonalView).toHaveBeenCalledTimes(1)
    expect(api.resolvePersonalView).toHaveBeenCalledWith(expect.not.objectContaining({ viewId: 'someone-else' }), expect.anything())
    expect(state.selectedId.value).toBe('')
    expect(state.linked.value).toBe(true)
  })

  it('honors an explicit dashboard-default choice ahead of the personal default', async () => {
    const { state } = setup()
    await state.load('10', { view: 'default' })
    expect(api.resolvePersonalView).toHaveBeenCalledWith({ dashboardId: '10' }, expect.anything())
    expect(state.linked.value).toBe(false)
  })

  it('preserves current filters and tabs as temporary state after deleting a view', async () => {
    const { state, values } = setup(true)
    vi.mocked(api.resolvePersonalView).mockResolvedValue({ code: 200, msg: '成功', data: { viewId: 'default', viewName: '经营', stateJson: '{"schemaVersion":2,"filters":{"region":{"value":["华东"]}},"tabs":{"g":{"activeCardId":"2"}}}' } })
    vi.mocked(api.deletePersonalView).mockResolvedValue({ code: 200, msg: '成功' })
    await state.load('10', {})
    await state.remove()
    expect(values.value.region?.value).toEqual(['华东'])
    expect(state.tabs.value.g?.activeCardId).toBe('2')
    expect(state.selectedId.value).toBe('')
    expect(state.linked.value).toBe(true)
    expect(state.dirty.value).toBe(false)
    expect(state.preference.value.defaultViewId).toBeUndefined()
  })

  it('does not block the dashboard when view management is unavailable', async () => {
    const { state } = setup()
    vi.mocked(api.listPersonalViews).mockRejectedValue(new Error('list unavailable'))
    vi.mocked(api.resolvePersonalView).mockResolvedValue({ code: 200, msg: '成功', data: { viewId: 'default', viewName: '经营', stateJson: '{"schemaVersion":2,"filters":{},"tabs":{}}', revision: 3 } })
    await state.load('10', {})
    expect(state.ready.value).toBe(true)
    expect(state.viewsAvailable.value).toBe(false)
    expect(state.metadataNotice.value).toBe('视图列表加载失败，请重试')
    expect(state.selected.value?.viewName).toBe('经营')
    expect(state.error.value).toBe('')
    vi.mocked(api.listPersonalViews).mockResolvedValue({ code: 200, msg: '成功', data: { list: [{ id: 'default', viewName: '经营' }] } })
    await state.retryMetadata()
    expect(state.viewsAvailable.value).toBe(true)
    expect(state.metadataNotice.value).toBe('')
  })

  it('makes the fallback explicit when preferences are unavailable', async () => {
    const { state } = setup()
    vi.mocked(api.getReportPreference).mockRejectedValue(new Error('preferences unavailable'))
    await state.load('10', {})
    expect(state.ready.value).toBe(true)
    expect(api.resolvePersonalView).toHaveBeenCalledWith({ dashboardId: '10' }, expect.anything())
    expect(state.metadataNotice.value).toBe('个人设置加载失败，已使用看板默认设置')
  })

  it('keeps a required state-restoration error visible when retrying only view metadata', async () => {
    const { state } = setup()
    vi.mocked(api.listPersonalViews).mockRejectedValue(new Error('list unavailable'))
    vi.mocked(api.resolvePersonalView).mockRejectedValue({ msg: '查看状态不可用' })
    await state.load('10', {})
    vi.mocked(api.listPersonalViews).mockResolvedValue({ code: 200, msg: '成功', data: { list: [] } })
    await state.retryMetadata()
    expect(state.metadataNotice.value).toBe('')
    expect(state.ready.value).toBe(false)
    expect(state.error.value).toBe('查看状态不可用')
  })

  it('does not save views without customizable state', async () => {
    const { state, defs } = setup()
    defs.value = []
    await state.load('10', {})
    await state.save('空视图')
    expect(api.savePersonalView).not.toHaveBeenCalled()
  })

  it('deletes another view without changing the current selection or its unsaved changes', async () => {
    const { state, values } = setup()
    vi.mocked(api.getReportPreference).mockResolvedValue({ code: 200, msg: '成功', data: { defaultViewId: 'other' } })
    vi.mocked(api.listPersonalViews).mockResolvedValue({ code: 200, msg: '成功', data: { list: [{ id: 'mine' }, { id: 'other' }] } })
    vi.mocked(api.resolvePersonalView).mockResolvedValue({ code: 200, msg: '成功', data: { viewId: 'mine', stateJson: '{"schemaVersion":2,"filters":{"region":{"value":["华东"]}},"tabs":{}}' } })
    vi.mocked(api.deletePersonalView).mockResolvedValue({ code: 200, msg: '成功' })
    await state.load('10', { viewId: 'mine' })
    values.value.region = { value: ['华南'] }
    await state.remove('other')
    expect(api.deletePersonalView).toHaveBeenCalledWith({ viewId: 'other' }, expect.anything())
    expect(state.selectedId.value).toBe('mine')
    expect(values.value.region?.value).toEqual(['华南'])
    expect(state.dirty.value).toBe(true)
    expect(state.linked.value).toBe(false)
    expect(state.preference.value.defaultViewId).toBeUndefined()
  })

  it('renames a row using that view’s saved state, without applying it', async () => {
    const { state, values } = setup()
    const otherState = '{"schemaVersion":2,"filters":{"region":{"value":["华北"]}},"tabs":{}}'
    vi.mocked(api.listPersonalViews).mockResolvedValue({ code: 200, msg: '成功', data: { list: [{ id: 'other', viewName: '区域经营', revision: 4, stateJson: otherState }] } })
    vi.mocked(api.savePersonalView).mockResolvedValue({ code: 200, msg: '成功', data: 'other' })
    await state.load('10', {})
    values.value.region = { value: ['华南'] }
    await state.rename('季度经营', 'other')
    expect(api.savePersonalView).toHaveBeenCalledWith({ dashboardId: '10', id: 'other', revision: 4, stateJson: otherState, viewName: '季度经营' }, expect.anything())
    expect(values.value.region?.value).toEqual(['华南'])
    expect(state.dirty.value).toBe(true)
    expect(api.resolvePersonalView).toHaveBeenCalledTimes(1)
  })

  it('sets another row as the opening default without switching the current view', async () => {
    const { state, values } = setup()
    vi.mocked(api.setDefaultPersonalView).mockResolvedValue({ code: 200, msg: '成功' })
    await state.load('10', {})
    values.value.region = { value: ['华南'] }
    await state.setDefault(false, 'other')
    expect(api.setDefaultPersonalView).toHaveBeenCalledWith({ dashboardId: '10', defaultViewId: 'other' }, expect.anything())
    expect(state.preference.value.defaultViewId).toBe('other')
    expect(state.selectedId.value).toBe('')
    expect(values.value.region?.value).toEqual(['华南'])
    expect(state.dirty.value).toBe(true)
    await state.setDefault(true, 'other')
    expect(state.preference.value.defaultViewId).toBeUndefined()
  })
})
