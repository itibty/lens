import type { VisDashFilterDef } from './dashFilterModel'
import { describe, expect, it, vi } from 'vitest'
import {
  applyFilterDefaults as facadeApplyFilterDefaults,
  parseDashConfig as facadeParseDashConfig,
} from './dashApi'
import {
  parseDashConfig,
  stringifyDashConfig,
} from './dashConfigCodec'
import {
  applyFilterDefaults,
  dashFilterChipText,
  filterValueReady,
  globalsForCard,
  normalizeFilterDef,
} from './dashFilterModel'

vi.mock('./dashboardRepository', () => ({}))

const selectFilter: VisDashFilterDef = {
  uid: 'region-filter',
  datasetId: 'dataset-1',
  field: 'region',
  label: '区域',
  applyAs: 'filter',
  formType: 'select',
  op: 'eq',
  options: {
    source: 'manual',
    items: [
      { label: '华东', value: 'east' },
      { label: '华南', value: 'south' },
    ],
  },
  defaultValue: { value: ['east'] },
}

describe('dashboard config codec', () => {
  it('falls back to safe defaults for malformed JSON', () => {
    expect(parseDashConfig('{invalid')).toEqual({
      filters: [],
      widgets: [],
      theme: 't1',
      cardRadius: 'md',
      autoRefreshSec: undefined,
      extra: {},
    })
  })

  it.each([
    ['empty input', undefined],
    ['JSON null', 'null'],
    ['JSON array', '[]'],
    ['JSON string', '"legacy"'],
    ['JSON number', '42'],
  ])('falls back to safe defaults for %s', (_label, raw) => {
    expect(parseDashConfig(raw)).toEqual({
      filters: [],
      widgets: [],
      theme: 't1',
      cardRadius: 'md',
      autoRefreshSec: undefined,
      extra: {},
    })
  })

  it('normalizes known fields and preserves unknown fields', () => {
    const config = parseDashConfig(JSON.stringify({
      filters: [selectFilter],
      widgets: [],
      theme: 't2',
      cardRadius: 'md',
      autoRefreshSec: 60,
      futureSetting: { enabled: true },
    }))

    expect(config).toEqual({
      filters: [selectFilter],
      widgets: [],
      theme: 't2',
      cardRadius: 'md',
      autoRefreshSec: 60,
      extra: { futureSetting: { enabled: true } },
    })
  })

  it('round-trips persisted settings without dropping extra fields', () => {
    const encoded = stringifyDashConfig(
      [selectFilter],
      { futureSetting: 'keep-me' },
      [],
      't2',
      'md',
      60,
    )

    expect(parseDashConfig(encoded)).toEqual({
      filters: [selectFilter],
      widgets: [],
      theme: 't2',
      cardRadius: 'md',
      autoRefreshSec: 60,
      extra: { futureSetting: 'keep-me' },
    })
  })
})

describe('dashboard filter model', () => {
  it('keeps the dashApi compatibility facade wired to the extracted modules', () => {
    expect(facadeParseDashConfig).toBe(parseDashConfig)
    expect(facadeApplyFilterDefaults).toBe(applyFilterDefaults)
  })

  it('normalizes text, number, date, and select filter definitions', () => {
    const base = {
      uid: 'filter-1',
      datasetId: ' dataset-1 ',
      field: ' amount ',
      label: '',
      applyAs: 'filter' as const,
    }

    expect(normalizeFilterDef({ ...base, formType: 'input', op: 'between' })).toMatchObject({
      datasetId: 'dataset-1',
      field: 'amount',
      label: 'amount',
      formType: 'input',
      op: 'eq',
    })
    expect(normalizeFilterDef({
      ...base,
      formType: 'number',
      op: 'between',
      defaultValue: { value: [10, 20] },
    })).toMatchObject({
      formType: 'numberRange',
      op: 'between',
      defaultValue: { value: [10, 20] },
    })
    expect(normalizeFilterDef({
      ...base,
      formType: 'date',
      op: 'between',
      defaultValue: { value: ['2026-09-01', '2026-09-03'] },
    })).toMatchObject({
      formType: 'dateRange',
      op: 'between',
      defaultValue: { value: ['2026-09-01', '2026-09-03'] },
    })
    expect(normalizeFilterDef({ ...base, formType: 'select' })).toMatchObject({
      formType: 'select',
      op: 'eq',
      options: { source: 'manual', items: [] },
    })
  })

  it('applies a ready default only when the user has not supplied a value', () => {
    expect(applyFilterDefaults([selectFilter], {})).toEqual({
      'region-filter': { value: ['east'], valueExp: undefined },
    })
    expect(applyFilterDefaults([selectFilter], {
      'region-filter': { value: ['south'] },
    })).toEqual({
      'region-filter': { value: ['south'], valueExp: undefined },
    })
  })

  it('requires both ends of a range', () => {
    const range: VisDashFilterDef = {
      ...selectFilter,
      formType: 'numberRange',
      op: 'between',
    }

    expect(filterValueReady(range, { value: [10] })).toBe(false)
    expect(filterValueReady(range, { value: [10, 20] })).toBe(true)
  })

  it('uses option labels in display text', () => {
    expect(dashFilterChipText(selectFilter, { value: ['east'] })).toBe('华东')
  })

  it('separates runtime filters and parameters by dataset', () => {
    const parameter: VisDashFilterDef = {
      uid: 'tenant-param',
      datasetId: 'dataset-1',
      field: 'tenant',
      label: '租户',
      applyAs: 'param',
      formType: 'input',
    }

    expect(globalsForCard(
      [selectFilter, parameter, { ...selectFilter, uid: 'other', datasetId: 'dataset-2' }],
      {
        'region-filter': { value: ['east'] },
        'tenant-param': { value: ['acme'] },
        'other': { value: ['south'] },
      },
      'dataset-1',
    )).toEqual({
      globalFilters: [{ field: 'region', op: 'eq', value: ['east'] }],
      globalParams: [{ field: 'tenant', label: '租户', value: ['acme'] }],
    })
  })
})
