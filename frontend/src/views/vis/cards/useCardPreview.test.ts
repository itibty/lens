import type { VisQueryConfig, VisVisualConfig } from '@/views/vis/shared/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'
import { queryCardData, queryCardPivot } from '@/apis/vis/query'
import { useCardPreview } from './useCardPreview'

vi.mock('@/apis/vis/query', () => ({ queryCardData: vi.fn(), queryCardPivot: vi.fn() }))

const scopes: ReturnType<typeof effectScope>[] = []
const success: VIS.RQueryDataResponse = {
  code: 200,
  msg: '成功',
  data: {
    columns: [],
    rows: [{ amount: 100 }],
    total: 1,
    truncated: false,
    queryMeta: { resultGeneratedAt: '2026-09-18T10:00:00Z' },
  },
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(queryCardData).mockResolvedValue(success)
})

afterEach(() => {
  scopes.splice(0).forEach(scope => scope.stop())
  vi.useRealTimers()
  vi.resetAllMocks()
})

function setup() {
  const input = reactive({
    query: { datasetId: '1', dimensions: [{ field: 'region' }], metrics: [{ field: 'amount', agg: 'SUM' }] } as VisQueryConfig,
    visual: { chartType: 'bar' } as VisVisualConfig,
    enabled: true,
    deferUpdates: false,
  })
  const events = { onIssues: vi.fn(), onRows: vi.fn() }
  const scope = effectScope()
  scopes.push(scope)
  const state = scope.run(() => useCardPreview(() => input, events))!
  return { input, events, scope, state }
}

async function advance(ms = 300) {
  await nextTick()
  await vi.advanceTimersByTimeAsync(ms)
}

function deferQuery() {
  let resolve!: (value: VIS.RQueryDataResponse) => void
  vi.mocked(queryCardData).mockImplementationOnce(() => new Promise((done) => {
    resolve = done
  }))
  return (value = success) => resolve(value)
}

describe('card preview refresh', () => {
  it('automatically loads valid configuration without emitting validation feedback', async () => {
    const { state, events } = setup()
    await advance()
    expect(queryCardData).toHaveBeenCalledTimes(1)
    expect(state.showPreview.value).toBe(true)
    expect(state.loading.value).toBe(false)
    expect(state.response.value).toEqual(success.data)
    expect(events.onRows).toHaveBeenLastCalledWith(success.data!.rows)
    expect(events.onIssues).not.toHaveBeenCalled()
  })

  it('updates nested UI settings immediately, preserving data and its timestamp', async () => {
    const { state, input } = setup()
    await advance()
    const data = state.response.value
    input.visual.chart = { legend: true }
    await nextTick()
    input.visual.chart.legend = false
    await nextTick()
    expect(state.appliedVisual.value?.chart?.legend).toBe(false)
    expect(state.loading.value).toBe(false)
    expect(state.response.value).toBe(data)
    await advance()
    expect(queryCardData).toHaveBeenCalledTimes(1)
  })

  it('keeps the last preview through intermediate input and applies the final UI on blur', async () => {
    const { state, input } = setup()
    input.visual.chart = { axes: { primary: { min: 0, max: 100 } } }
    await advance()
    const previous = state.appliedVisual.value
    input.deferUpdates = true
    input.visual.chart.axes!.primary!.min = 200
    await advance()
    expect(state.appliedVisual.value).toBe(previous)
    expect(state.valid.value).toBe(true)
    expect(state.showPreview.value).toBe(true)
    input.visual.chart.axes!.primary!.min = 20
    input.deferUpdates = false
    await advance(0)
    expect(state.appliedVisual.value?.chart?.axes?.primary?.min).toBe(20)
    expect(queryCardData).toHaveBeenCalledTimes(1)
  })

  it('queries once after data input is finished, regardless of typing pauses', async () => {
    const { input, state } = setup()
    await advance()
    input.deferUpdates = true
    input.query.limit = 1
    await advance(1000)
    input.query.limit = 100
    await advance(1000)
    expect(queryCardData).toHaveBeenCalledTimes(1)
    expect(state.appliedQuery.value?.limit).toBeUndefined()
    input.deferUpdates = false
    await advance()
    expect(queryCardData).toHaveBeenCalledTimes(2)
    expect(state.appliedQuery.value?.limit).toBe(100)
  })

  it('does not apply unfinished UI input when an in-flight request completes', async () => {
    const finish = deferQuery()
    const { input, state } = setup()
    input.visual.title = '原始标题'
    await advance()
    input.deferUpdates = true
    input.visual.title = '正在输入'
    await advance(0)
    finish()
    await advance(0)
    expect(state.appliedVisual.value?.title).toBe('原始标题')
    input.deferUpdates = false
    await advance(0)
    expect(state.appliedVisual.value?.title).toBe('正在输入')
    expect(queryCardData).toHaveBeenCalledTimes(1)
  })

  it('applies directly bound popover changes together when the popover closes', async () => {
    const { input, state } = setup()
    input.visual.chartType = 'table'
    input.visual.table = { marks: [{ fields: ['amount'], style: { color: '#1677FF' } }] }
    await advance()
    input.deferUpdates = true
    input.visual.table.marks![0]!.style!.color = '#FF0000'
    await advance()
    input.visual.table.marks![0]!.style!.color = '#00FF00'
    await advance()
    expect(state.appliedVisual.value?.table?.marks?.[0]?.style?.color).toBe('#1677FF')
    input.deferUpdates = false
    await advance(0)
    expect(state.appliedVisual.value?.table?.marks?.[0]?.style?.color).toBe('#00FF00')
    expect(queryCardData).toHaveBeenCalledTimes(1)
  })

  it('manual refresh reads the latest configuration even if input has not blurred', async () => {
    const { input, state } = setup()
    await advance()
    input.deferUpdates = true
    input.query.limit = 30
    input.visual.title = '最新标题'
    await state.runPreview()
    await advance()
    expect(state.appliedQuery.value?.limit).toBe(30)
    expect(state.appliedVisual.value?.title).toBe('最新标题')
    expect(queryCardData).toHaveBeenCalledTimes(2)
  })

  it('debounces data edits without delaying the query for UI edits', async () => {
    const { input } = setup()
    await advance(100)
    input.query.limit = 10
    await advance(200)
    input.query.limit = 20
    await advance(200)
    input.visual.cardColor = '#123456'
    await advance(100)
    expect(queryCardData).toHaveBeenCalledTimes(1)
    expect(vi.mocked(queryCardData).mock.calls[0]![1].query?.limit).toBe(20)
  })

  it('keeps an in-flight query while applying the latest UI when it returns', async () => {
    const finish = deferQuery()
    const { input, state } = setup()
    await advance()
    input.visual.cardColor = '#123456'
    await advance()
    expect(state.loading.value).toBe(true)
    expect(queryCardData).toHaveBeenCalledTimes(1)
    finish()
    await advance(0)
    expect(state.appliedVisual.value?.cardColor).toBe('#123456')
    expect(state.response.value).toEqual(success.data)
    expect(state.loading.value).toBe(false)
  })

  it('ignores a stale response after a newer query has completed', async () => {
    const finishOld = deferQuery()
    const { input, state, events } = setup()
    await advance()
    input.query.limit = 20
    await advance()
    finishOld({ ...success, data: { ...success.data!, rows: [{ amount: -1 }] } })
    await advance(0)
    expect(queryCardData).toHaveBeenCalledTimes(2)
    expect(state.response.value).toEqual(success.data)
    expect(state.appliedQuery.value?.limit).toBe(20)
    expect(events.onRows).toHaveBeenCalledTimes(1)
  })

  it('stays silent for invalid configuration, but reports fresh errors on manual refresh', async () => {
    const { input, state, events } = setup()
    input.query.metrics = []
    await advance()
    expect(queryCardData).not.toHaveBeenCalled()
    expect(events.onIssues).not.toHaveBeenCalled()
    expect(state.showPreview.value).toBe(false)
    await state.runPreview()
    const firstIssues = events.onIssues.mock.calls[0]![0]
    expect(firstIssues).toEqual(expect.arrayContaining([expect.objectContaining({ shelf: 'metrics' })]))
    await state.runPreview()
    const nextIssues = events.onIssues.mock.calls[1]![0]
    expect(nextIssues).toEqual(firstIssues)
    expect(nextIssues[0]).not.toBe(firstIssues[0])
    input.query.metrics = [{ field: 'amount', agg: 'SUM' }]
    await advance()
    expect(state.showPreview.value).toBe(true)
    expect(queryCardData).toHaveBeenCalledTimes(1)
    expect(events.onIssues).toHaveBeenCalledTimes(2)
  })

  it('reuses data after a temporary invalid UI setting is repaired', async () => {
    const { input, state } = setup()
    await advance()
    input.visual.chart = { axes: { primary: { min: 10, max: 1 } } }
    await advance()
    expect(state.showPreview.value).toBe(false)
    input.visual.chart.axes!.primary!.max = 100
    await advance()
    expect(state.showPreview.value).toBe(true)
    expect(queryCardData).toHaveBeenCalledTimes(1)
  })

  it('forces a manual query and cancels the queued automatic refresh', async () => {
    const { input, state, events } = setup()
    await advance()
    await state.runPreview()
    expect(queryCardData).toHaveBeenCalledTimes(2)
    input.query.limit = 50
    await state.runPreview()
    await advance()
    expect(queryCardData).toHaveBeenCalledTimes(3)
    expect(events.onIssues).toHaveBeenLastCalledWith([])
  })

  it('pauses and discards in-flight data while the editor is disabled', async () => {
    const finish = deferQuery()
    const { input, state } = setup()
    await advance()
    input.enabled = false
    await nextTick()
    finish()
    await advance()
    expect(state.loading.value).toBe(false)
    expect(state.showPreview.value).toBe(false)
    await state.runPreview()
    expect(queryCardData).toHaveBeenCalledTimes(1)
    input.enabled = true
    await advance()
    expect(state.showPreview.value).toBe(true)
    expect(queryCardData).toHaveBeenCalledTimes(2)
  })

  it('keeps query errors through UI edits and retries on manual refresh', async () => {
    vi.mocked(queryCardData).mockRejectedValueOnce({ msg: '查询失败' })
    const { input, state } = setup()
    await advance()
    expect(state.errorMsg.value).toBe('查询失败')
    expect(state.showPreview.value).toBe(true)
    input.visual.cardColor = '#123456'
    await advance()
    expect(queryCardData).toHaveBeenCalledTimes(1)
    expect(state.errorMsg.value).toBe('查询失败')
    await state.runPreview()
    expect(state.errorMsg.value).toBe('')
    expect(state.response.value).toEqual(success.data)
  })

  it('previews static content without a data request', async () => {
    const { input, state } = setup()
    input.visual = { chartType: 'url', web: { url: 'https://example.com' } }
    await advance()
    expect(state.showPreview.value).toBe(true)
    expect(state.loading.value).toBe(false)
    expect(queryCardData).not.toHaveBeenCalled()
    expect(queryCardPivot).not.toHaveBeenCalled()
  })

  it.each(['reset', 'dispose'] as const)('discards pending work on %s', async (action) => {
    const finish = deferQuery()
    const { state, scope, events } = setup()
    await advance()
    if (action === 'reset')
      state.resetPreview()
    else
      scope.stop()
    finish()
    await advance()
    expect(state.loading.value).toBe(false)
    expect(state.showPreview.value).toBe(false)
    expect(state.response.value.rows).toEqual([])
    expect(events.onRows).not.toHaveBeenCalledWith(success.data!.rows)
  })
})
