import type { MetricPill } from '../shared/dnd'
import type { VisQueryConfig } from '../shared/types'
import { describe, expect, it } from 'vitest'
import { retainQueryIssues } from './cardValidation'
import { collectQueryIssues } from './chartShape'

function query(): VisQueryConfig {
  return { datasetId: '1', dimensions: [{ field: 'region' }], metrics: [{ field: 'amount', agg: 'SUM' }] }
}

describe('card validation timing', () => {
  it('does not introduce errors while editing before an explicit check', () => {
    const draft = query()
    draft.metrics = []
    const errors = collectQueryIssues('bar', draft)
    expect(errors.length).toBeGreaterThan(0)
    expect(retainQueryIssues([], errors)).toEqual([])
  })

  it('clears repaired errors without surfacing new ones or changing existing error identity', () => {
    const draft = query()
    draft.datasetId = ''
    draft.metrics = []
    const shown = collectQueryIssues('bar', draft)
    const metricError = shown.find(item => item.shelf === 'metrics')!
    draft.datasetId = '1'
    draft.dimensions = []
    const checkedAgain = collectQueryIssues('bar', draft)
    const remaining = retainQueryIssues(shown, checkedAgain)
    expect(remaining).toEqual([metricError])
    expect(remaining[0]).toBe(metricError)
    expect(checkedAgain.some(item => item.shelf === 'dimensions')).toBe(true)
    draft.metrics = query().metrics
    expect(retainQueryIssues(remaining, collectQueryIssues('bar', draft))).toEqual([])
  })

  it('waits for another explicit check before displaying the next issue on the same field', () => {
    const draft = query()
    draft.dimensions = []
    draft.metrics = [{ field: 'amount', agg: 'SUM', _uid: 'm1', contrast: {} } as MetricPill]
    const shown = collectQueryIssues('number', draft)
    expect(shown.some(item => item.message === '对比指标需要填写显示名')).toBe(true)
    draft.metrics[0]!.label = '增长率'
    const next = collectQueryIssues('number', draft)
    expect(next.some(item => item.message === '对比指标需要选择日期字段')).toBe(true)
    expect(retainQueryIssues(shown, next)).toEqual([])
  })
})
