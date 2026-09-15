import type { DashFilterValues, VisDashFilterDef } from './dashApi'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { getSubscriptionRunView } from '@/apis/vis/dashboardSubscription'
import * as api from '@/apis/vis/personalReport'
import { useDashboardViewState } from './useDashboardViewState'

vi.mock('@/apis/vis/personalReport', () => ({
  getReportPreference: vi.fn(),
  listPersonalViews: vi.fn(),
  resolvePersonalView: vi.fn(),
  recordReportVisit: vi.fn(),
}))
vi.mock('@/apis/vis/dashboardSubscription', () => ({ getSubscriptionRunView: vi.fn() }))
vi.mock('@/utils', () => ({ s2o: (text: string) => JSON.parse(text), showToast: vi.fn() }))
vi.mock('./dashboardRepository', () => ({}))
const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  scopes.splice(0).forEach(scope => scope.stop())
  vi.resetAllMocks()
})
function setup() {
  const defs = ref<VisDashFilterDef[]>([{ uid: 'region', datasetId: '1', field: 'region', label: '地区', formType: 'select', applyAs: 'filter' }])
  const values = ref<DashFilterValues>({})
  const scope = effectScope()
  scopes.push(scope)
  const state = scope.run(() => useDashboardViewState(defs, values))!
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

  it('does not fall back to unfiltered results after an incompatible saved view', async () => {
    const { state } = setup()
    vi.mocked(api.resolvePersonalView).mockRejectedValue({ msg: '视图需要更新' })
    await state.load('10', {})
    expect(state.ready.value).toBe(false)
    expect(state.error.value).toBe('视图需要更新')
    expect(api.resolvePersonalView).toHaveBeenCalledTimes(1)
  })
})
