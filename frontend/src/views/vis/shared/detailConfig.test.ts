import type { VisQueryConfig, VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import { collectQueryIssues, pillMessage, shelfMessage } from '../cards/chartShape'
import { resolveAllowDetail } from './cardDetail'
import { defaultDetailFields, detailConfigIssue, normalizeDetailConfig } from './detailConfig'
import { listTableColumns } from './listTable'

describe('same-dataset detail configuration', () => {
  it('prefills distinct raw fields when a user enables details', () => {
    expect(defaultDetailFields({ datasetId: '1', rowDimensions: [{ field: 'region', label: '地区' }], colDimensions: [{ field: 'date', timeGrain: 'month' }], metrics: [{ field: 'amount', label: '销售额', agg: 'SUM' }, { field: 'amount', agg: 'AVG' }] })).toEqual(['region', 'date', 'amount'])
  })
  it.each([undefined, {}, { fields: [] }, { fields: [''] }, { fields: ['amount', ' '] }])('hides incomplete details and blocks saving enabled cards: %j', (detail) => {
    const visual: VisVisualConfig = { chartType: 'number', allowDetail: true, detail }
    expect(resolveAllowDetail(visual)).toBe(false)
    expect(detailConfigIssue(visual)?.message).toBe('请至少选择一个明细字段')
    expect(normalizeDetailConfig(detail)?.fields).toEqual(detail?.fields)
  })
  it('keeps optional defaults while requiring explicit detail fields', () => {
    const visual: VisVisualConfig = { chartType: 'number', allowDetail: true, detail: { fields: ['amount'] } }
    expect(resolveAllowDetail(visual)).toBe(true)
    expect(detailConfigIssue(visual, [{ field: 'amount', dataType: 'number' }])).toBeUndefined()
    expect(detailConfigIssue(visual, [])?.message).toBe('明细字段已不可用，请重新选择')
  })
  it('allows saving disabled details without filling historical configuration', () => {
    const visual: VisVisualConfig = { chartType: 'number', allowDetail: false }
    expect(resolveAllowDetail(visual)).toBe(false)
    expect(detailConfigIssue(visual)).toBeUndefined()
    expect(resolveAllowDetail()).toBe(false)
  })
  it('routes missing fields and invalid limits through the designer issue system', () => {
    const query: VisQueryConfig = { datasetId: '1', metrics: [{ field: 'amount', agg: 'SUM' }] }
    const fields = [{ field: 'amount', dataType: 'number' as const }]
    const visual: VisVisualConfig = { chartType: 'number', allowDetail: true }
    let issues = collectQueryIssues('number', query, fields, visual)
    expect(shelfMessage(issues, 'detail')).toBe('请至少选择一个明细字段')

    visual.detail = { fields: ['amount'], limit: 5001 }
    issues = collectQueryIssues('number', query, fields, visual)
    expect(shelfMessage(issues, 'detail')).toBeUndefined()
    expect(pillMessage(issues, 'detail', 'detail:limit')).toBe('明细最多行数须在 1～5000 之间')

    visual.detail.limit = 1000
    expect(collectQueryIssues('number', query, fields, visual)).toEqual([])
  })
  it('locates incomplete query models before reporting detail configuration', () => {
    const query: VisQueryConfig = { datasetId: '1', metrics: [] }
    const visual: VisVisualConfig = { chartType: 'number', allowDetail: true }
    const issues = collectQueryIssues('number', query, [], visual)
    expect(issues[0]?.shelf).toBe('metrics')
    expect(shelfMessage(issues, 'detail')).toBe('请至少选择一个明细字段')
  })
  it('removes obsolete target rules and dependent settings when a column is removed', () => {
    const old = { fields: ['amount'], fieldOptions: { amount: { label: '金额' }, date: { label: '日期' } }, orderList: [{ field: 'date', dir: 'desc' as const }], rules: [{ targetCardId: '2' }], limit: 25 }
    expect(normalizeDetailConfig(old)).toEqual({ fields: ['amount'], fieldOptions: { amount: { label: '金额' } }, orderList: [], limit: 25 })
  })
  it('formats raw detail cells without changing their data or field identity', () => {
    const row = { amount: 1234.5 }
    const columns = listTableColumns({ datasetId: '1' }, { columns: ['amount'], rows: [row], total: 1, truncated: false }, false, undefined, undefined, { amount: { label: '金额', format: { decimals: 2, prefix: '¥' } } })
    expect(columns[0]).toMatchObject({ field: 'amount', title: '金额' })
    expect(columns[0]).not.toHaveProperty('style.textAlign')
    const format = (columns[0] as { fieldFormat: (record: Record<string, unknown>) => string }).fieldFormat
    expect(format(row)).toContain('1,234.50')
    expect(format(row)).toContain('¥')
    expect(row.amount).toBe(1234.5)
  })
})
