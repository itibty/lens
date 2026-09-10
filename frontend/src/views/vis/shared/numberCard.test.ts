import type { VisVisualConfig } from './types'
import { describe, expect, it } from 'vitest'
import { resolveNumberView } from './numberCard'

const query: VIS.QueryConfig = {
  datasetId: '1',
  metrics: [{ field: 'sales', agg: 'SUM' }],
}
const visual: VisVisualConfig = { chartType: 'number' }

function data(rows: Record<string, unknown>[]): VIS.QueryDataResponse {
  return { columns: ['sales'], rows, total: rows.length, truncated: false }
}

describe('number card empty result', () => {
  it('treats an aggregate row without a primary value as empty', () => {
    expect(resolveNumberView(query, data([{}]), visual)).toBeNull()
    expect(resolveNumberView(query, data([{ sales: null }]), visual)).toBeNull()
  })

  it('keeps zero as a valid metric value', () => {
    expect(resolveNumberView(query, data([{ sales: 0 }]), visual)?.body).toBe('0')
  })
})
