import type { VisDashFilterDef } from './dashFilterModel'
import type { DashWidget } from './dashLayout'
import type { DashCardRadiusId, DashThemeId } from './dashTheme'
import { sanitizeAutoRefreshSec } from '@/views/vis/shared/cardRefresh'
import { normalizeFilterDef, persistFilterDef } from './dashFilterModel'
import { sanitizeWidgets } from './dashLayout'
import { DEFAULT_DASH_CARD_RADIUS, DEFAULT_DASH_THEME, resolveDashCardRadiusId, resolveDashThemeId } from './dashTheme'

export interface VisDashConfig {
  filters: VisDashFilterDef[]
  widgets: DashWidget[]
  theme: DashThemeId
  cardRadius: DashCardRadiusId
  autoRefreshSec?: number
  extra: Record<string, unknown>
}

export interface DashSettingsDraft {
  filters: VisDashFilterDef[]
  theme: DashThemeId
  cardRadius: DashCardRadiusId
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
  return {
    filters: readFilterList(parsed.filters),
    widgets: sanitizeWidgets(parsed.widgets),
    theme: resolveDashThemeId(typeof parsed.theme === 'string' ? parsed.theme : undefined),
    cardRadius: resolveDashCardRadiusId(typeof parsed.cardRadius === 'string' ? parsed.cardRadius : undefined),
    autoRefreshSec: sanitizeAutoRefreshSec(parsed.autoRefreshSec),
    extra,
  }
}

export function stringifyDashConfig(
  filters: VisDashFilterDef[],
  extra: Record<string, unknown> = {},
  widgets: DashWidget[] = [],
  theme?: DashThemeId,
  cardRadius?: DashCardRadiusId,
  autoRefreshSec?: number,
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
  const resolved = resolveDashThemeId(theme)
  if (resolved === DEFAULT_DASH_THEME)
    delete body.theme
  else
    body.theme = resolved
  const radius = resolveDashCardRadiusId(cardRadius)
  if (radius === DEFAULT_DASH_CARD_RADIUS)
    delete body.cardRadius
  else
    body.cardRadius = radius
  const refreshSec = sanitizeAutoRefreshSec(autoRefreshSec)
  if (refreshSec)
    body.autoRefreshSec = refreshSec
  else
    delete body.autoRefreshSec
  body.widgets = widgets
  return JSON.stringify(body)
}
