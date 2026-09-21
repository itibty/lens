import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { queryCardData } from '@/apis/vis/query'
import { useVisCardQuery } from './useVisCardQuery'

vi.mock('@/apis/vis/query', () => ({ queryCardData: vi.fn(), queryCardPivot: vi.fn() }))
vi.mock('@/views/vis/cards/cardApi', () => ({ normalizeQueryForRequest: (query: unknown) => query, toPivotQuery: (query: unknown) => query }))

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  scopes.splice(0).forEach(scope => scope.stop())
  vi.resetAllMocks()
})
function setup() {
  const input = { query: { datasetId: '1' }, visual: { chartType: 'table' as const }, globalFilters: [{ field: 'region', value: ['华东'] }] }
  const scope = effectScope()
  scopes.push(scope)
  return { input, state: scope.run(() => useVisCardQuery(() => input))! }
}
const success: VIS.RQueryDataResponse = { code: 200, msg: '成功', data: { columns: [], total: 1, truncated: false, rows: [{ total: 8 }], queryMeta: { resultGeneratedAt: '2026-09-14T10:00:00Z' } } }

describe('query refresh result and time consistency', () => {
  it.each([false, true])('shows initial loading and keeps results during refresh (silent=%s)', async (silent) => {
    const { state } = setup()
    vi.mocked(queryCardData).mockResolvedValueOnce(success)
    const initial = state.run({ silent })
    expect(state.loading.value).toBe(true)
    expect(state.refreshing.value).toBe(true)
    await initial

    const updated = {
      ...success,
      data: { ...success.data!, rows: [{ total: 16 }], queryMeta: { resultGeneratedAt: '2026-09-21T10:00:00Z' } },
    }
    vi.mocked(queryCardData).mockResolvedValueOnce(updated)
    const refresh = state.run({ silent })
    expect(state.loading.value).toBe(!silent)
    expect(state.refreshing.value).toBe(true)
    expect(state.data.value).toEqual(success.data)
    await refresh
    expect(state.data.value).toEqual(updated.data)
    expect(state.loading.value).toBe(false)
    expect(state.refreshing.value).toBe(false)
  })

  it.each([false, true])('preserves results on refresh failure and clears them for changed filters (silent=%s)', async (silent) => {
    const { state, input } = setup()
    vi.mocked(queryCardData).mockResolvedValueOnce(success)
    await state.run()
    vi.mocked(queryCardData).mockRejectedValueOnce({ msg: '数据库超时' })
    const refresh = state.run({ silent })
    expect(state.loading.value).toBe(!silent)
    expect(state.data.value).toEqual(success.data)
    await refresh
    expect(state.data.value).toEqual(success.data)
    expect(state.refreshError.value).toBe('数据库超时')
    expect(state.error.value).toBe('')
    expect(state.loading.value).toBe(false)
    expect(state.refreshing.value).toBe(false)
    input.globalFilters[0]!.value = ['华南']
    vi.mocked(queryCardData).mockRejectedValueOnce({ msg: '数据库超时' })
    const changedFilters = state.run({ silent })
    expect(state.loading.value).toBe(true)
    expect(state.data.value.rows).toEqual([])
    expect(state.data.value.queryMeta).toBeUndefined()
    await changedFilters
    expect(state.error.value).toBe('数据库超时')
    expect(state.loading.value).toBe(false)
    expect(state.refreshing.value).toBe(false)
  })

  it('discards a slow response after filters changed', async () => {
    const { state, input } = setup()
    let first!: (value: typeof success) => void
    vi.mocked(queryCardData).mockImplementationOnce(() => new Promise((resolve) => {
      first = resolve
    }))
    const old = state.run()
    input.globalFilters[0]!.value = ['华南']
    vi.mocked(queryCardData).mockResolvedValueOnce({ code: 200, msg: '成功', data: { columns: [], total: 1, truncated: false, rows: [{ total: 99 }] } })
    await state.run()
    first(success)
    await old
    expect(state.data.value.rows).toEqual([{ total: 99 }])
    expect(state.refreshing.value).toBe(false)
  })
})
