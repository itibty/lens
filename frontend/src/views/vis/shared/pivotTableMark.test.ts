import type { TYPES } from '@visactor/vtable'
import type { VisQueryConfig, VisTableMarkRule, VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import { DARK_THEME, LIGHT_THEME } from '@/theme/tokens'
import { fieldStyleKey } from './fieldStyle'
import { listTableColumns } from './listTable'
import { buildPivotTableOption, PIVOT_SUBTOTAL_TOKEN, PIVOT_TOTAL_TOKEN } from './pivotTable'
import { resolveVTableTheme } from './vtableTheme'

const metric: VIS.MetricItem = { field: 'amount', label: '销售额', agg: 'SUM' }
const query: VisQueryConfig = {
  datasetId: '1',
  rowDimensions: [{ field: 'region', label: '区域' }, { field: 'city', label: '城市' }],
  colDimensions: [{ field: 'month', label: '月份' }],
  metrics: [metric, { field: 'target', label: '目标', agg: 'SUM' }],
}
const data: VIS.PivotQueryResponse = {
  rowFields: ['区域', '城市'],
  columnFields: ['月份'],
  metrics: ['销售额', '目标'],
  columns: [{ id: 'jan', path: ['一月'], role: 'detail' }],
  rows: [{ path: ['华东', '上海'], role: 'detail', level: 2, values: { jan: { 销售额: 60.125, 目标: 100 } } }],
  total: 1,
  truncated: false,
  columnTruncated: false,
}
type CellStyle = Record<string, unknown> | ((args: TYPES.StylePropertyFunctionArg) => Record<string, unknown>)
interface CellDefine {
  style?: CellStyle
  headerStyle?: CellStyle
  format?: (value: unknown) => string
  fieldFormat?: (record: Record<string, unknown>) => string
}
function styleOf(define: unknown, args: TYPES.StylePropertyFunctionArg, header = false) {
  const cell = define as CellDefine
  const style = header ? cell.headerStyle : cell.style
  const resolved = typeof style === 'function' ? style(args) : style ?? {}
  return Object.fromEntries(Object.entries(resolved).map(([key, value]) => [key, typeof value === 'function' ? value(args) : value]))
}
function bodyArgs(record: unknown, value = 60.125): TYPES.StylePropertyFunctionArg {
  return { col: 2, row: 2, table: { getCellOriginRecord: () => record, getCellOriginValue: () => value } } as unknown as TYPES.StylePropertyFunctionArg
}
function headerArgs(axis: 'row' | 'column', members: TYPES.IDimensionInfo[], corner = false): TYPES.StylePropertyFunctionArg {
  return {
    col: axis === 'row' ? 0 : 2,
    row: axis === 'row' ? 2 : 0,
    table: {
      getCellOriginRecord: () => undefined,
      getCellHeaderPaths: () => ({
        cellLocation: corner ? 'cornerHeader' : axis === 'row' ? 'rowHeader' : 'columnHeader',
        rowHeaderPaths: axis === 'row' ? members : [],
        colHeaderPaths: axis === 'column' ? members : [],
      }),
    },
  } as unknown as TYPES.StylePropertyFunctionArg
}
function visual(marks: VisTableMarkRule[], treeDisplay = false): VisVisualConfig {
  return { chartType: 'pivot', table: { marks, treeDisplay } }
}

describe('pivot data annotations', () => {
  it.each([false, true])('marks actual row/column members in treeDisplay=%s without a body record', (treeDisplay) => {
    const option = buildPivotTableOption(data, visual([
      { fields: ['区域'], style: { color: '#123456' } },
      { fields: ['城市'], style: { bgColor: '#abcdef' }, filters: [{ field: '区域', op: 'eq', value: ['华东'] }] },
      { fields: ['月份'], style: { italic: true }, filters: [{ field: '月份', op: 'eq', value: ['一月'] }] },
    ], treeDisplay), query)!
    const region = { dimensionKey: '区域', value: '华东' }
    expect(styleOf(option.rows![0], headerArgs('row', [region]), true)).toEqual({ color: '#123456' })
    expect(styleOf(option.rows![1], headerArgs('row', [region, { dimensionKey: '城市', value: '上海' }]), true)).toEqual({ bgColor: '#abcdef' })
    expect(styleOf(option.rows![1], headerArgs('row', [{ ...region, value: '华南' }, { dimensionKey: '城市', value: '广州' }]), true).bgColor).not.toBe('#abcdef')
    expect(styleOf(option.columns![0], headerArgs('column', [{ dimensionKey: '月份', value: '一月' }]), true)).toEqual({ fontStyle: 'italic' })
    expect(styleOf(option.rows![0], headerArgs('row', [region], true), true).color).not.toBe('#123456')
  })

  it('never borrows metrics for headers or annotates synthetic subtotal/total labels', () => {
    const option = buildPivotTableOption(data, visual([
      { fields: ['区域'], style: { color: '#123456' }, filters: [{ field: '销售额', op: 'ne', value: [0] }] },
      { fields: ['城市', '月份'], style: { bold: true } },
    ]), query)!
    expect(styleOf(option.rows![0], headerArgs('row', [{ dimensionKey: '区域', value: '华东' }]), true).color).not.toBe('#123456')
    expect(styleOf(option.rows![1], headerArgs('row', [{ dimensionKey: '区域', value: '华东' }, { dimensionKey: '城市', value: PIVOT_SUBTOTAL_TOKEN }]), true).fontWeight).toBe(600)
    expect(styleOf(option.columns![0], headerArgs('column', [{ dimensionKey: '月份', value: PIVOT_TOTAL_TOKEN }]), true).fontWeight).toBe(600)
  })

  it.each([LIGHT_THEME, DARK_THEME])('keeps header styles cell-dependent despite dimension caching, with $mode theme fallbacks', (theme) => {
    const option = buildPivotTableOption(data, visual([{ fields: ['月份'], style: { color: '#123456', bgColor: '#abcdef', italic: true }, filters: [{ field: '月份', op: 'eq', value: ['一月'] }] }]), query, undefined, theme)!
    const column = option.columns![0] as CellDefine
    // 缓存的应是逐格属性函数，不能是首个表头求值后的颜色。
    expect(typeof column.headerStyle).toBe('object')
    const jan = headerArgs('column', [{ dimensionKey: '月份', value: '一月' }])
    const feb = headerArgs('column', [{ dimensionKey: '月份', value: '二月' }])
    expect(styleOf(column, jan, true)).toEqual({ color: '#123456', bgColor: '#abcdef', fontStyle: 'italic' })
    const fallback = styleOf(column, feb, true)
    const themeHeader = resolveVTableTheme(visual([]), theme).headerStyle!
    expect(fallback.color).toBe(themeHeader.color)
    expect(fallback.bgColor).toBe(themeHeader.bgColor)
    expect(fallback.fontStyle).toBe('normal')
    expect(styleOf(column, jan, true).color).toBe('#123456')
  })

  it('evaluates a pivot record array using the raw cross-cell dimensions and all metrics', () => {
    const option = buildPivotTableOption(data, visual([{ fields: ['销售额'], style: { color: '#123456' }, filters: [
      { field: '区域', op: 'eq', value: ['华东'] },
      { field: '月份', op: 'eq', value: ['一月'] },
      { field: '目标', op: 'gte', value: [100] },
    ] }]), query)!
    const record = { 区域: '华东', 城市: '上海', 月份: '一月', 销售额: 60.125, 目标: 100 }
    expect(styleOf(option.indicators![0], bodyArgs([record]))).toEqual({ color: '#123456' })
    expect(styleOf(option.indicators![0], bodyArgs([{ ...record, 目标: 99 }]))).toEqual({})
    expect(styleOf(option.indicators![0], bodyArgs([]))).toEqual({})
    expect(styleOf(option.indicators![0], bodyArgs([record, record]))).toEqual({})
  })

  it('applies unconditional metric marks and leaves other metrics alone', () => {
    const option = buildPivotTableOption(data, visual([{ fields: ['销售额'], style: { color: '#123456' } }]), query)!
    const args = bodyArgs([{ 销售额: 0, 目标: 100 }], 0)
    expect(styleOf(option.indicators![0], args)).toEqual({ color: '#123456' })
    expect(styleOf(option.indicators![1], args)).toEqual({})
  })

  it('uses backend totals, skipping conditions on dimensions absent at that grain', () => {
    const option = buildPivotTableOption(data, visual([
      { fields: ['销售额'], style: { bold: true }, filters: [{ field: '销售额', op: 'gt', value: [100] }] },
      { fields: ['销售额'], style: { color: '#123456' }, filters: [{ field: '城市', op: 'ne', value: ['上海'] }] },
    ]), query)!
    for (const record of [
      { 区域: '华东', 城市: PIVOT_SUBTOTAL_TOKEN, 月份: '一月', 销售额: 200 },
      { 区域: '华东', 月份: '一月', 销售额: 200 },
      { 区域: PIVOT_TOTAL_TOKEN, 月份: PIVOT_TOTAL_TOKEN, 销售额: 200 },
    ])
      expect(styleOf(option.indicators![0], bodyArgs([record], 200))).toEqual({ fontWeight: 'bold' })
  })
})

describe.each(['table', 'pivot'] as const)('%s annotation / format priority', (chartType) => {
  it.each([LIGHT_THEME, DARK_THEME])('preserves numeric formats and progress bars in the $mode theme', (theme) => {
    const configured: VisVisualConfig = {
      chartType,
      fieldStyles: [{ key: fieldStyleKey(metric), kind: 'metric', format: { decimals: 1, suffix: '%', signColor: 'positive-red' }, cellVisual: { type: 'progress', color: '#88aaff' } }],
      table: { marks: [
        { fields: ['销售额'], style: { bgColor: '#abcdef', bold: true } },
        { fields: ['销售额'], style: { color: '#123456' }, filters: [{ field: '销售额', op: 'gt', value: [60.1] }] },
      ] },
    }
    const listQuery = { ...query, dimensions: query.rowDimensions }
    const record = { 区域: '华东', 城市: '上海', 月份: '一月', 销售额: 60.125 }
    const option = chartType === 'pivot'
      ? buildPivotTableOption(data, configured, query, undefined, theme)!.indicators![0]
      : listTableColumns(listQuery, { columns: ['销售额'], rows: [record], total: 1, truncated: false }, true, configured, theme)[0]
    const define = option as CellDefine
    expect(chartType === 'pivot' ? define.format!(60.125) : define.fieldFormat!(record)).toBe('60.1%')
    for (const value of [60.125, 40, -40, 0]) {
      const row = { ...record, 销售额: value }
      const style = styleOf(option, bodyArgs(chartType === 'pivot' ? [row] : row, value))
      expect(style).toMatchObject({ bgColor: '#abcdef', fontWeight: 'bold', barColor: '#88aaff', barHeight: '100%' })
      if (value === 60.125)
        expect(style.color).toBe('#123456')
      else if (value !== 0)
        expect(style.color).toBe(value > 0 ? theme.status.danger.base : theme.status.success.base)
      else
        expect(style).not.toHaveProperty('color')
    }
  })
})

it('keeps ordinary table dimension marks driven by the whole row, without coloring headers', () => {
  const record = { 区域: '华东', 销售额: 100 }
  const columns = listTableColumns({ ...query, dimensions: query.rowDimensions }, { columns: ['区域', '销售额'], rows: [record], total: 1, truncated: false }, true, {
    chartType: 'table',
    table: { marks: [{ fields: ['区域', '销售额'], style: { color: '#123456' }, filters: [{ field: '销售额', op: 'gt', value: [50] }] }] },
  })
  for (const column of columns) {
    expect(styleOf(column, bodyArgs(record, 100))).toEqual({ color: '#123456' })
    expect(styleOf(column, bodyArgs({ ...record, 销售额: 20 }, 20))).toEqual({})
    expect((column as CellDefine).headerStyle).toBeUndefined()
  }
})
