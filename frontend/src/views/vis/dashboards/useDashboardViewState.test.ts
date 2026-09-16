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
  return { state, values }
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
  it('keeps an explicit link when choosing a view with the same state', async () => {
    const { state } = setup(true)
    await state.load('10', {})
    const replaceState = vi.fn()
    vi.stubGlobal('window', { location: { href: 'http://localhost/vis/report/10?vs=current&viewId=old' }, history: { state: {}, replaceState } })
    await state.choose('')
    const url = replaceState.mock.calls[0]![2] as URL
    expect(url.searchParams.get('vs')).toBe('current')
    expect(url.searchParams.has('viewId')).toBe(false)
    expect(state.dirty.value).toBe(false)
  })
})
