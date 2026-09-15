import type { DashFilterValues, VisDashFilterDef } from './dashApi'
import { snapshotFilterValue } from './dashApi'

export interface DashboardViewState {
  schemaVersion: 1
  filters: DashFilterValues
}

export function captureViewState(defs: VisDashFilterDef[], values: DashFilterValues): DashboardViewState {
  const filters: DashFilterValues = {}
  for (const def of [...defs].sort((a, b) => a.uid.localeCompare(b.uid)))
    filters[def.uid] = snapshotFilterValue(values[def.uid])
  return { schemaVersion: 1, filters }
}

export function parseViewState(json: string): DashboardViewState {
  const parsed = JSON.parse(json)
  if (parsed?.schemaVersion !== 1 || !parsed.filters || typeof parsed.filters !== 'object' || Array.isArray(parsed.filters))
    throw new Error('个人视图格式或版本不受支持')
  if (Object.keys(parsed).some(key => !['schemaVersion', 'filters'].includes(key)))
    throw new Error('个人视图包含暂不支持的状态')
  return parsed as DashboardViewState
}
