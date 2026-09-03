import type { VisDashFilterDef } from './dashFilterModel'
import type { DashWidget } from './dashLayout'
import type { DashCardRadiusId, DashThemeId } from './dashTheme'
import type { VisCard } from '@/views/vis/shared/types'
import vis from '@/apis/vis/index'
import { fromVisCardInfo } from '@/views/vis/cards/cardApi'
import { parseDashConfig, stringifyDashConfig } from './dashConfigCodec'
import { collectCardIds, dropMissingCards, sanitizeWidgets } from './dashLayout'

export function isVisDisabled(status?: string) {
  return status === 'DBL'
}

export async function loadDashboardCards(
  info: VIS.VisDashboardInfo,
  cardIds: string[],
): Promise<Record<string, VisCard>> {
  const statusById = new Map((info.cards ?? []).map(item => [String(item.cardId || ''), item.status]))
  const map: Record<string, VisCard> = {}
  await Promise.all(cardIds.map(async (cardId) => {
    if (!cardId)
      return
    try {
      const res = await vis.query.getCardDetail({ cardId })
      if (!res.data)
        return
      const card = fromVisCardInfo(res.data)
      if (isVisDisabled(statusById.get(cardId)))
        card.status = 'DBL'
      map[cardId] = card
    }
    catch {
      // 已删、禁用，或未挂在当前用户可看的看板上
    }
  }))
  return map
}

export async function loadDashboardWidgets(info: VIS.VisDashboardInfo) {
  const config = parseDashConfig(info.configJson)
  const configuredCardIds = collectCardIds(config.widgets)
  const cardMap = await loadDashboardCards(info, configuredCardIds)
  // 以后端成员关系判断卡片是否已删除，不能用详情请求是否成功判断；
  // 临时网络或权限错误时保留 widget，避免下次保存永久删卡。
  const activeCardIds = (info.cards ?? [])
    .map(item => String(item.cardId || ''))
    .filter(Boolean)
  return {
    filters: config.filters,
    extra: config.extra,
    theme: config.theme,
    cardRadius: config.cardRadius,
    autoRefreshSec: config.autoRefreshSec,
    widgets: dropMissingCards(config.widgets, activeCardIds),
    cardMap,
  }
}

function toDashSaveCards(cardIds: string[]): VIS.VisDashboardLayoutItem[] {
  return cardIds.map(cardId => ({
    cardId,
    layoutJson: '{}',
  }))
}

export async function saveDashboard(input: {
  id?: string
  name: string
  status: 'EBL' | 'DBL'
  groupId?: string
  desc?: string
  icon?: string
  filters: VisDashFilterDef[]
  theme?: DashThemeId
  cardRadius?: DashCardRadiusId
  autoRefreshSec?: number
  extra?: Record<string, unknown>
  widgets: DashWidget[]
}) {
  const widgets = sanitizeWidgets(input.widgets)
  const body: VIS.VisDashboardSaveRequest = {
    dashName: input.name.trim(),
    status: input.status,
    groupId: input.groupId && input.groupId !== '0' ? input.groupId : '0',
    dashDesc: input.desc?.trim() || '',
    icon: input.icon?.trim() || undefined,
    configJson: stringifyDashConfig(
      input.filters,
      input.extra ?? {},
      widgets,
      input.theme,
      input.cardRadius,
      input.autoRefreshSec,
    ),
    cards: toDashSaveCards(collectCardIds(widgets)),
  }
  if (input.id != null && String(input.id).trim() !== '')
    body.id = input.id
  const saved = await vis.dashboard.editDashboard(body)
  const dashboardId = saved.data != null ? String(saved.data) : (input.id || '')
  if (!dashboardId)
    throw new Error('保存看板失败')
  return dashboardId
}
