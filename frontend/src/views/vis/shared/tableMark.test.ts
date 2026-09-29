import type { MarkStyleArg } from './tableMark'
import type { VisQueryConfig, VisTableMarkRule } from './types'
import { describe, expect, it } from 'vitest'
import { bindMarkColumnStyle, isMarkTargetDisabled, listMarkableFields, listMarkFilterFields, prepareTableMarks, syncTableMarkFields } from './tableMark'

const query: VisQueryConfig = {
  datasetId: '1',
  rowDimensions: [{ field: 'region', label: '区域' }, { field: 'city', label: '城市' }],
  colDimensions: [{ field: 'month', label: '月份' }],
  metrics: [{ field: 'amount', label: '销售额', agg: 'SUM' }],
}

describe('mark field choices', () => {
  const options = listMarkableFields(query, [{ field: 'unused' }], 'pivot')
  const aliases = (items: typeof options) => items.map(item => item.alias)

  it('offers only active fields, grouped by their actual pivot locations', () => {
    expect(options.map(({ alias, kind }) => [alias, kind])).toEqual([
      ['区域', 'row'],
      ['城市', 'row'],
      ['月份', 'column'],
      ['销售额', 'metric'],
    ])
    expect(isMarkTargetDisabled(options, ['区域'], options[1]!, 'pivot')).toBe(false)
    expect(isMarkTargetDisabled(options, ['区域'], options[2]!, 'pivot')).toBe(true)
    expect(isMarkTargetDisabled(options, ['区域'], options[3]!, 'pivot')).toBe(true)
    expect(isMarkTargetDisabled(options, ['区域', '销售额'], options[3]!, 'pivot')).toBe(false)
  })

  it('limits header conditions to the shared ancestor path of all selected targets', () => {
    expect(aliases(listMarkFilterFields(options, ['城市'], 'pivot'))).toEqual(['区域', '城市'])
    expect(aliases(listMarkFilterFields(options, ['区域', '城市'], 'pivot'))).toEqual(['区域'])
    expect(aliases(listMarkFilterFields(options, ['月份'], 'pivot'))).toEqual(['月份'])
    expect(listMarkFilterFields(options, [], 'pivot')).toEqual([])
    expect(listMarkFilterFields(options, ['removed'], 'pivot')).toEqual([])
    expect(listMarkFilterFields(options, ['销售额'], 'pivot')).toEqual(options)
  })

  it('keeps ordinary table dimension/metric mixed targets and whole-row conditions', () => {
    const fields = listMarkableFields({ ...query, dimensions: query.rowDimensions }, [], 'table')
    expect(aliases(fields)).toEqual(['区域', '城市', '销售额'])
    expect(listMarkFilterFields(fields, [], 'table')).toEqual([])
    expect(listMarkFilterFields(fields, ['区域'], 'table')).toBe(fields)
    expect(isMarkTargetDisabled(fields, ['区域'], fields[2]!, 'table')).toBe(false)
  })

  it('uses numeric conditions for counts of text fields', () => {
    const fields = listMarkableFields({ datasetId: '1', metrics: [{ field: 'order_id', agg: 'COUNT_DISTINCT' }] }, [{ field: 'order_id', dataType: 'string' }], 'table')
    expect(fields[0]?.dataType).toBe('number')
  })

  it('drops only conditions outside the new target scope and preserves valid values and styles', () => {
    const rules: VisTableMarkRule[] = [{
      fields: ['区域', '城市'],
      style: { color: '#123456' },
      filters: [
        { field: '区域', op: 'eq', value: ['华东'] },
        { field: '城市', op: 'eq', value: ['上海'] },
      ],
    }]
    const next = syncTableMarkFields(rules, options, 'pivot')
    expect(next[0]?.filters).toEqual([rules[0]!.filters![0]])
    expect(next[0]?.style).toBe(rules[0]?.style)
    expect(rules[0]?.filters).toHaveLength(2)
    expect(syncTableMarkFields(next, options, 'pivot')).toBe(next)
  })

  it('clears filters after all targets disappear, and removes fields deleted from the shelf', () => {
    const rules: VisTableMarkRule[] = [{ fields: ['城市'], filters: [{ field: '区域', op: 'eq', value: ['华东'] }] }]
    const next = syncTableMarkFields(rules, options.filter(item => item.alias !== '城市'), 'pivot')
    expect(next[0]).toMatchObject({ fields: [], filters: [] })
    expect(syncTableMarkFields([{ ...rules[0]!, fields: [] }], options, 'table')[0]?.filters).toEqual([])
  })

  it('retains table conditions across dimension/metric target changes, clearing only removed fields', () => {
    const options = listMarkableFields({ ...query, dimensions: query.rowDimensions }, [], 'table')
    const rules: VisTableMarkRule[] = [{ fields: ['区域', '销售额'], filters: [
      { field: '销售额', op: 'gt', value: [100] },
      { field: '城市', op: 'eq', value: ['上海'] },
    ] }]
    expect(syncTableMarkFields(rules, options, 'table')).toBe(rules)
    expect(syncTableMarkFields(rules, options.filter(item => item.alias !== '城市'), 'table')[0]?.filters)
      .toEqual([rules[0]!.filters![0]])
  })
})

function styleFor(marks: VisTableMarkRule[], record: Record<string, unknown>) {
  const rules = prepareTableMarks({ chartType: 'table', table: { marks } })
  const style = bindMarkColumnStyle(rules, 'amount')
  const args = { col: 1, row: 1, table: { getCellOriginRecord: () => record } } as unknown as MarkStyleArg
  return typeof style === 'function' ? style(args) : style
}

describe('shared mark conditions', () => {
  it('compares numeric ranges numerically and date ranges chronologically', () => {
    const numeric: VisTableMarkRule = { fields: ['amount'], style: { bold: true }, filters: [{ field: 'amount', op: 'between', value: [2, 10] }] }
    expect(styleFor([numeric], { amount: 9 })).toEqual({ fontWeight: 'bold' })
    expect(styleFor([numeric], { amount: 11 })).toEqual({})
    const date = { ...numeric, filters: [{ field: 'date', op: 'between' as const, value: ['2026-09-01', '2026-09-30'] }] }
    expect(styleFor([date], { date: '2026-09-15 12:30:00' })).toEqual({ fontWeight: 'bold' })
    expect(styleFor([date], { date: '2026-10-01' })).toEqual({})
  })

  it('distinguishes a removed/missing field from an explicit null, including OR rules', () => {
    const rule: VisTableMarkRule = { fields: ['amount'], style: { color: '#123456' }, filters: [{ field: 'region', op: 'is_null' }] }
    expect(styleFor([rule], { amount: 10 })).toEqual({})
    expect(styleFor([rule], { amount: 10, region: null })).toEqual({ color: '#123456' })
    expect(styleFor([{ ...rule, combineOp: 'or', filters: [...rule.filters!, { field: 'amount', op: 'gt', value: [0] }] }], { amount: 10 })).toEqual({})
  })

  it('combines matching rules in order, overriding only explicitly configured properties', () => {
    expect(styleFor([
      { fields: ['amount'], style: { color: '#123456', bgColor: '#abcdef', bold: true } },
      { fields: ['amount'], style: { color: '#654321', italic: true }, filters: [{ field: 'amount', op: 'gt', value: [0] }] },
    ], { amount: 10 })).toEqual({ color: '#654321', bgColor: '#abcdef', fontWeight: 'bold', fontStyle: 'italic' })
  })
})
