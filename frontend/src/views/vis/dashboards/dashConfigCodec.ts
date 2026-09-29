import type { DashCardDisplayOverrides } from './dashCardDisplay'
import type { VisDashFilterDef } from './dashFilterModel'
import type { DashWidget } from './dashLayout'
import { sanitizeAutoRefreshSec } from '@/views/vis/shared/cardRefresh'
import { sanitizeCardDisplayOverrides } from './dashCardDisplay'
import { normalizeFilterDef, persistFilterDef } from './dashFilterModel'
import { collectCardIds, sanitizeWidgets } from './dashLayout'

export interface VisDashConfig {
  cardDisplayOverrides: DashCardDisplayOverrides
  filters: VisDashFilterDef[]
  widgets: DashWidget[]
  autoRefreshSec?: number
  extra: Record<string, unknown>
}

export interface DashSettingsDraft {
  filters: VisDashFilterDef[]
  autoRefreshSec?: number
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw?.trim())
    return fallback
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return fallback
  }
}

function isFilterDef(item: unknown): item is VisDashFilterDef {
  if (!item || typeof item !== 'object')
    return false
  const row = item as Partial<VisDashFilterDef>
  return Boolean(row.uid && row.field && row.datasetId)
}

function readFilterList(raw: unknown): VisDashFilterDef[] {
  return Array.isArray(raw)
    ? raw.filter(isFilterDef).map(item => normalizeFilterDef(item))
    : []
}

export function parseDashConfig(raw?: string): VisDashConfig {
  const decoded = parseJson<unknown>(raw, {})
  const parsed: Record<string, unknown> = decoded != null
    && typeof decoded === 'object'
    && !Array.isArray(decoded)
    ? decoded as Record<string, unknown>
    : {}
  const extra = { ...parsed }
  delete extra.filters
  delete extra.theme
  delete extra.cardRadius
  delete extra.autoRefreshSec
  delete extra.widgets
  delete extra.cardDisplayOverrides
  const widgets = sanitizeWidgets(parsed.widgets)
  return {
    cardDisplayOverrides: sanitizeCardDisplayOverrides(parsed.cardDisplayOverrides, collectCardIds(widgets)),
    filters: readFilterList(parsed.filters),
    widgets,
    autoRefreshSec: sanitizeAutoRefreshSec(parsed.autoRefreshSec),
    extra,
  }
}

export function stringifyDashConfig(
  filters: VisDashFilterDef[],
  extra: Record<string, unknown> = {},
  widgets: DashWidget[] = [],
  autoRefreshSec?: number,
  cardDisplayOverrides: DashCardDisplayOverrides = {},
) {
  const body: Record<string, unknown> = { ...extra }
  const ready = filters.map(persistFilterDef).filter(item => item.uid && item.field && item.datasetId)
  if (ready.length)
    body.filters = ready
  else
    delete body.filters
  delete body.widgets
  delete body.cardRadius
  delete body.autoRefreshSec
  delete body.theme
  const refreshSec = sanitizeAutoRefreshSec(autoRefreshSec)
  if (refreshSec)
    body.autoRefreshSec = refreshSec
  else
    delete body.autoRefreshSec
  const overrides = sanitizeCardDisplayOverrides(cardDisplayOverrides, collectCardIds(widgets))
  delete body.cardDisplayOverrides
  if (Object.keys(overrides).length)
    body.cardDisplayOverrides = overrides
  body.widgets = widgets
  return JSON.stringify(body)
}
