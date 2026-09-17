import type { VisCard } from '../shared/types'
import { describe, expect, it } from 'vitest'
import { copyName } from '../shared/copyName'
import { normalizeQueryForRequest, toVisCardSaveRequest } from './cardApi'
import { createCardCopy } from './cardCopy'

const source: VisCard = {
  id: '2100410609496285185',
  updatedAt: '1789088400000',
  name: '营收趋势',
  desc: '说明',
  status: 'DBL',
  query: { datasetId: '9101', dimensions: [{ field: 'month' }], metrics: [{ field: 'revenue', label: '营收', agg: 'SUM' }], filters: [{ combineOp: 'and', conditions: [{ field: 'region', op: 'eq', value: ['华东'] }] }] },
  visual: { chartType: 'bar', chart: { seriesStyles: [{ metric: '营收', style: { color: '#ff0000' } }], axes: { primary: { min: 0, max: 100 } } } },
}

describe('card copies', () => {
  it('creates an independent draft without the source identity, keeping query, state and style', () => {
    const copy = createCardCopy(source)
    expect(copy).toEqual({ ...source, id: '', updatedAt: '', name: '营收趋势 · 副本' })
    copy.query.filters![0].conditions[0].value = ['华南']
    copy.visual.chart!.axes!.primary!.max = 200
    expect(source.query.filters![0].conditions[0].value).toEqual(['华东'])
    expect(source.visual.chart!.axes!.primary!.max).toBe(100)
  })

  it('saves the current draft as a new entity without modifying the original visual', () => {
    const draft = createCardCopy(source)
    draft.query.filters![0].conditions[0].value = ['华南']
    draft.visual.chart!.seriesStyles!.push({ metric: '已移除', style: { color: '#000000' } })
    const before = structuredClone(draft)
    const request = toVisCardSaveRequest(draft, normalizeQueryForRequest(draft.query, 'bar'))
    expect(request.id).toBeUndefined()
    expect(request.status).toBe('DBL')
    expect(JSON.parse(request.queryJson!).filters[0].conditions[0].value).toEqual(['华南'])
    expect(JSON.parse(request.visualJson!).chart.seriesStyles).toHaveLength(1)
    expect(draft).toEqual(before)
    draft.id = '2100410609496285186'
    expect(toVisCardSaveRequest(draft, draft.query).id).toBe(draft.id)
  })

  it.each(['table', 'pivot', 'richtext', 'url'] as const)('deep copies %s configuration', (chartType) => {
    const card = { ...source, visual: { ...source.visual, chartType } }
    const copy = createCardCopy(card)
    expect(copy.visual).toEqual(card.visual)
    expect(copy.visual).not.toBe(card.visual)
    expect(copy.query).toEqual(card.query)
    expect(copy.query).not.toBe(card.query)
  })

  it('keeps the default copy name within the database limit', () => {
    expect(copyName('  营收  ')).toBe('营收 · 副本')
    expect(copyName('营'.repeat(50))).toHaveLength(50)
    expect(copyName('营'.repeat(50))).toMatch(/ · 副本$/)
  })
})
