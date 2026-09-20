import type { VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import {
  buildFieldStyleCandidates,
  fieldStyleFromDraft,
  fieldStyleKey,
  implicitFieldFormat,
  resolveMetricFormat,
  resolveSignColor,
  suggestedFieldSuffix,
  syncFieldStyles,
} from './fieldStyle'

const diffRateMetric: VIS.MetricItem & { _uid?: string } = {
  _uid: 'metric-diff-rate',
  field: 'sales',
  label: '销售额同比',
  agg: 'SUM',
  contrast: {
    timeField: 'order_date',
    calcMethod: 'shift_year',
    calcType: 'diffRate',
    valueExp: 'current_month',
  },
}

describe('field style suffix', () => {
  it('does not infer a percent suffix while rendering a diff-rate metric', () => {
    expect(implicitFieldFormat(diffRateMetric).suffix).toBe('')
    expect(resolveMetricFormat({ chartType: 'table' }, diffRateMetric).suffix).toBe('')
  })

  it('offers percent only as the initial editor suggestion', () => {
    expect(suggestedFieldSuffix(diffRateMetric)).toBe('%')
    expect(suggestedFieldSuffix({ field: 'sales', agg: 'SUM' })).toBe('')
  })

  it('renders percent only after the user saves it in the format rule', () => {
    const candidate = {
      sourceUid: diffRateMetric._uid!,
      key: fieldStyleKey(diffRateMetric),
      alias: diffRateMetric.label!,
      display: diffRateMetric.label!,
      diffRate: true,
      metric: diffRateMetric,
    }
    const rule = fieldStyleFromDraft(candidate, {
      ...implicitFieldFormat(diffRateMetric),
      suffix: '%',
    })
    const visual: VisVisualConfig = { chartType: 'table', fieldStyles: [rule] }

    expect(rule.format).toEqual({ suffix: '%' })
    expect(resolveMetricFormat(visual, diffRateMetric).suffix).toBe('%')
  })
})

describe('field sign colors', () => {
  it.each([
    ['positive-red', 10, 'var(--el-color-danger)'],
    ['positive-red', -10, 'var(--el-color-success)'],
    ['positive-green', 10, 'var(--el-color-success)'],
    ['positive-green', -10, 'var(--el-color-danger)'],
  ] as const)('uses %s for %s', (rule, value, color) => {
    expect(resolveSignColor(value, rule)).toBe(color)
    expect(resolveSignColor(String(value), rule)).toBe(color)
  })

  it.each([0, -0, null, undefined, '', 'invalid', Number.NaN, Number.POSITIVE_INFINITY])('leaves %s uncolored', (value) => {
    expect(resolveSignColor(value, 'positive-red')).toBeUndefined()
    expect(resolveSignColor(value, 'positive-green')).toBeUndefined()
  })

  it('does not infer any sign rule for existing or newly configured metrics', () => {
    const format = resolveMetricFormat({ chartType: 'number' }, diffRateMetric)
    expect(format).not.toHaveProperty('signColor')
    expect(resolveSignColor(10, format.signColor)).toBeUndefined()
    expect(resolveSignColor(-10, format.signColor)).toBeUndefined()
    const candidate = buildFieldStyleCandidates([diffRateMetric])[0]!
    expect(fieldStyleFromDraft(candidate, implicitFieldFormat(diffRateMetric)).format).toBeUndefined()
  })

  it('persists explicit rules across serialization and clears only the sign setting', () => {
    const candidates = buildFieldStyleCandidates([diffRateMetric])
    const candidate = candidates[0]!
    const rule = fieldStyleFromDraft(candidate, {
      ...implicitFieldFormat(diffRateMetric),
      suffix: '%',
      signColor: 'positive-red',
    })
    const saved = syncFieldStyles(JSON.parse(JSON.stringify([rule])), candidates)
    const format = resolveMetricFormat({ chartType: 'number', fieldStyles: saved }, diffRateMetric)
    expect(format.signColor).toBe('positive-red')
    const cleared = fieldStyleFromDraft(candidate, { ...format, signColor: undefined })
    expect(cleared.format).toEqual({ suffix: '%' })
    expect(resolveSignColor(10, cleared.format?.signColor)).toBeUndefined()
  })
})
