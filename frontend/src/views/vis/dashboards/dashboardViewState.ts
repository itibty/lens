import type { DashFilterValues, VisDashFilterDef } from './dashFilterModel'
import type { DashWidget } from './dashLayout'
import { snapshotFilterValue } from './dashFilterModel'

export type DashTabValues = Record<string, { activeCardId: string }>

export interface DashboardViewState {
  schemaVersion: 2
  filters: DashFilterValues
  tabs: DashTabValues
}

export function resolveTabValues(widgets: DashWidget[], saved: DashTabValues = {}): DashTabValues {
  const tabs: DashTabValues = {}
  for (const widget of [...widgets].sort((a, b) => ('id' in a ? a.id : '').localeCompare('id' in b ? b.id : ''))) {
    if (widget.kind !== 'group' || widget.mode !== 'tabs')
      continue
    const members = widget.pages.map(page => page.items[0]?.cardId).filter((id): id is string => !!id)
    const selected = saved[widget.id]?.activeCardId
    const activeCardId = selected && members.includes(selected) ? selected : members[0]
    if (activeCardId)
      tabs[widget.id] = { activeCardId }
  }
  return tabs
}

export function captureViewState(defs: VisDashFilterDef[], values: DashFilterValues, tabs: DashTabValues = {}): DashboardViewState {
  const filters: DashFilterValues = {}
  for (const def of [...defs].sort((a, b) => a.uid.localeCompare(b.uid)))
    filters[def.uid] = snapshotFilterValue(values[def.uid])
  const sortedTabs: DashTabValues = {}
  for (const id of Object.keys(tabs).sort())
    sortedTabs[id] = { activeCardId: tabs[id]!.activeCardId }
  return { schemaVersion: 2, filters, tabs: sortedTabs }
}

export function parseViewState(json: string): DashboardViewState {
  const parsed = JSON.parse(json)
  if (![1, 2].includes(parsed?.schemaVersion) || !parsed.filters || typeof parsed.filters !== 'object' || Array.isArray(parsed.filters))
    throw new Error('个人视图格式或版本不受支持')
  const keys = parsed.schemaVersion === 1 ? ['schemaVersion', 'filters'] : ['schemaVersion', 'filters', 'tabs']
  if (Object.keys(parsed).some(key => !keys.includes(key)))
    throw new Error('个人视图包含暂不支持的状态')
  const tabs = parsed.tabs ?? {}
  if (!tabs || typeof tabs !== 'object' || Array.isArray(tabs))
    throw new Error('Tab 状态格式无效')
  return { schemaVersion: 2, filters: parsed.filters, tabs }
}
