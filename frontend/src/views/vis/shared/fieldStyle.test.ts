import type { VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import {
  fieldStyleFromDraft,
  fieldStyleKey,
  implicitFieldFormat,
  resolveMetricFormat,
  suggestedFieldSuffix,
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
