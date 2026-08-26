/**
 * 看板布局树。根节点是卡片或分组；组内卡片相对组，也按 24 列。
 * 分组配置弹窗用 DashGroupDraft，写回走 createGroupFromDraft / applyGroupDraft。
 */
import {
  DASH_COL_NUM,
  DASH_DEFAULT_H,
  DASH_DEFAULT_W,
  DASH_GROUP_DEFAULT_H,
  DASH_GROUP_DEFAULT_W,
  DASH_GROUP_MIN_H,
  DASH_GROUP_MIN_W,
  DASH_MIN_H,
  DASH_MIN_W,
} from './config'

export interface DashLayoutRect {
  x: number
  y: number
  w: number
  h: number
}

export type DashGroupMode = 'tile' | 'tabs'

export interface DashCardWidget extends DashLayoutRect {
  kind: 'card'
  cardId: string
}

export interface DashPageItem extends DashLayoutRect {
  cardId: string
}

export interface DashGroupPage {
  id: string
  title?: string
  items: DashPageItem[]
}

export interface DashGroupLook {
  bg?: string
  color?: string
  /** 不写 = 展示子卡片标题 */
  showCardTitle?: boolean
}

export interface DashGroupWidget extends DashLayoutRect, DashGroupLook {
  kind: 'group'
  id: string
  title: string
  description?: string
  mode: DashGroupMode
  pages: DashGroupPage[]
}

export type DashWidget = DashCardWidget | DashGroupWidget

export function createDashUid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function widgetKey(widget: DashWidget) {
  return widget.kind === 'card' ? `c:${widget.cardId}` : `g:${widget.id}`
}

export function widgetMinSize(widget: DashWidget) {
  if (widget.kind === 'group')
    return { minW: DASH_GROUP_MIN_W, minH: DASH_GROUP_MIN_H }
  return { minW: DASH_MIN_W, minH: DASH_MIN_H }
}

export function sameRect(a: DashLayoutRect, b: DashLayoutRect) {
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h
}

export function nextRect(
  nodes: DashLayoutRect[],
  size: { w: number, h: number } = { w: DASH_DEFAULT_W, h: DASH_DEFAULT_H },
): DashLayoutRect {
  const w = Math.min(DASH_COL_NUM, Math.max(1, size.w))
  const h = Math.max(1, size.h)
  if (!nodes.length)
    return { x: 0, y: 0, w, h }
  const bottom = nodes.reduce((max, item) => Math.max(max, item.y + item.h), 0)
  const last = nodes[nodes.length - 1]
  if (last && last.x + last.w + w <= DASH_COL_NUM && last.y + last.h === bottom)
    return { x: last.x + last.w, y: last.y, w, h }
  return { x: 0, y: bottom, w, h }
}

export function createEmptyPage(title?: string): DashGroupPage {
  return {
    id: createDashUid('p'),
    ...(title ? { title } : {}),
    items: [],
  }
}

export function flattenGroupItems(group: DashGroupWidget): DashPageItem[] {
  return group.pages.flatMap(page => page.items)
}

function relayoutItems(items: DashPageItem[]): DashPageItem[] {
  const laid: DashPageItem[] = []
  for (const item of items) {
    const wide = item.w >= DASH_COL_NUM
    laid.push({
      cardId: item.cardId,
      ...nextRect(laid, {
        w: wide ? DASH_DEFAULT_W : Math.max(DASH_MIN_W, item.w),
        h: wide ? DASH_DEFAULT_H : Math.max(DASH_MIN_H, item.h),
      }),
    })
  }
  return laid
}

function itemsFromIds(prev: DashPageItem[], cardIds: string[]): DashPageItem[] {
  const byId = new Map(prev.map(item => [item.cardId, item]))
  const next: DashPageItem[] = []
  for (const cardId of cardIds) {
    if (!cardId)
      continue
    const old = byId.get(cardId)
    next.push(old ?? { cardId, ...nextRect(next) })
  }
  return next
}

export function pagesFromItems(
  mode: DashGroupMode,
  items: DashPageItem[],
  tabTitles: Record<string, string> = {},
): DashGroupPage[] {
  if (mode === 'tabs') {
    if (!items.length)
      return [createEmptyPage()]
    return items.map((item) => {
      const title = tabTitles[item.cardId]?.trim()
      return {
        id: createDashUid('p'),
        ...(title ? { title } : {}),
        items: [{
          cardId: item.cardId,
          x: 0,
          y: 0,
          w: DASH_COL_NUM,
          h: Math.max(DASH_DEFAULT_H, item.h),
        }],
      }
    })
  }
  return [{
    id: createDashUid('p'),
    items: [...items],
  }]
}

export interface DashGroupDraft extends DashGroupLook {
  title: string
  description: string
  mode: DashGroupMode
  cardIds: string[]
  tabTitles: Record<string, string>
  showCardTitle: boolean
}

export function emptyGroupDraft(): DashGroupDraft {
  return {
    title: '',
    description: '',
    mode: 'tile',
    cardIds: [],
    tabTitles: {},
    showCardTitle: true,
  }
}

export function groupEmptyHint(design: boolean) {
  return design ? '通过卡片菜单移入分组' : '分组里还没有卡片'
}

export function draftFromGroup(
  group: DashGroupWidget,
  cardName: (cardId: string) => string,
): DashGroupDraft {
  const tabTitles: Record<string, string> = {}
  for (const page of group.pages) {
    const cardId = page.items[0]?.cardId
    if (!cardId)
      continue
    tabTitles[cardId] = page.title?.trim() || cardName(cardId)
  }
  return {
    title: group.title,
    description: group.description ?? '',
    mode: group.mode,
    cardIds: flattenGroupItems(group).map(item => item.cardId),
    tabTitles,
    bg: group.bg,
    color: group.color,
    showCardTitle: group.showCardTitle !== false,
  }
}

export function lookFromDraft(draft: DashGroupLook): DashGroupLook {
  const bg = draft.bg?.trim()
  const color = draft.color?.trim()
  return {
    ...(bg ? { bg } : {}),
    ...(color ? { color } : {}),
    ...(draft.showCardTitle === false ? { showCardTitle: false } : {}),
  }
}

function stripLook(group: DashGroupWidget): DashGroupWidget {
  const { bg: _bg, color: _color, showCardTitle: _show, ...rest } = group
  return rest
}

function sameLook(a: DashGroupLook, b: DashGroupLook) {
  return (a.bg || '') === (b.bg || '')
    && (a.color || '') === (b.color || '')
    && (a.showCardTitle !== false) === (b.showCardTitle !== false)
}

function withTabTitles(pages: DashGroupPage[], tabTitles: Record<string, string> = {}): DashGroupPage[] {
  return pages.map((page) => {
    const cardId = page.items[0]?.cardId
    const title = (cardId && tabTitles[cardId]?.trim()) || ''
    if (!title)
      return page.title ? { ...page, title: undefined } : page
    return page.title === title ? page : { ...page, title }
  })
}

export function createGroupFromDraft(widgets: DashWidget[], draft: DashGroupDraft): DashWidget[] {
  let next = widgets
  for (const cardId of draft.cardIds)
    next = removeCardFromTree(next, cardId)
  const items = itemsFromIds([], draft.cardIds)
  const laid = draft.mode === 'tile' ? relayoutItems(items) : items
  return [
    ...next,
    {
      ...createEmptyGroup(nextRect(next, { w: DASH_GROUP_DEFAULT_W, h: DASH_GROUP_DEFAULT_H })),
      ...lookFromDraft(draft),
      title: draft.title.trim() || '未命名分组',
      description: draft.description.trim(),
      mode: draft.mode,
      pages: pagesFromItems(draft.mode, laid, draft.tabTitles),
    },
  ]
}

export function applyGroupDraft(
  widgets: DashWidget[],
  groupId: string,
  draft: DashGroupDraft,
): DashWidget[] {
  const group = widgets.find((item): item is DashGroupWidget => item.kind === 'group' && item.id === groupId)
  if (!group)
    return widgets
  const prevItems = flattenGroupItems(group)
  const prevIds = prevItems.map(item => item.cardId)
  const sameCards = prevIds.join(',') === draft.cardIds.join(',')
  const title = draft.title.trim() || '未命名分组'
  const description = draft.description.trim()
  const titledPages = draft.mode === 'tabs' ? withTabTitles(group.pages, draft.tabTitles) : group.pages
  const tabsChanged = titledPages.some((page, index) => page !== group.pages[index])
  const look = lookFromDraft(draft)
  // 成员和展示方式没变：只改标题、说明、页签、外观
  if (sameCards && group.mode === draft.mode) {
    if (group.title === title && (group.description ?? '') === description && !tabsChanged && sameLook(group, look))
      return widgets
    return widgets.map(widget => widget.kind === 'group' && widget.id === groupId
      ? { ...stripLook(widget), title, description, pages: titledPages, ...look }
      : widget)
  }
  // 成员或展示方式变了：重排组内格子，被移出的卡回根画布
  const prevSet = new Set(prevIds)
  let next = widgets
  for (const cardId of draft.cardIds) {
    if (!prevSet.has(cardId))
      next = removeCardFromTree(next, cardId)
  }
  const items = itemsFromIds(prevItems, draft.cardIds)
  const laid = draft.mode === 'tile' && group.mode === 'tabs' ? relayoutItems(items) : items
  const leaving = prevIds.filter(id => !draft.cardIds.includes(id))
  next = next.map((widget) => {
    if (widget.kind !== 'group' || widget.id !== groupId)
      return widget
    return {
      ...stripLook(widget),
      title,
      description,
      mode: draft.mode,
      pages: sameCards && draft.mode === 'tile' && group.mode === 'tile'
        ? [{ ...(widget.pages[0] ?? createEmptyPage()), items: laid }]
        : pagesFromItems(draft.mode, laid, draft.tabTitles),
      ...look,
    }
  })
  return addCardsToRoot(next, leaving)
}

export function createEmptyGroup(rect?: DashLayoutRect): DashGroupWidget {
  return {
    kind: 'group',
    id: createDashUid('g'),
    title: '未命名分组',
    description: '',
    mode: 'tile',
    ...(rect ?? { x: 0, y: 0, w: DASH_GROUP_DEFAULT_W, h: DASH_GROUP_DEFAULT_H }),
    pages: [createEmptyPage()],
  }
}

export function collectCardIds(widgets: DashWidget[]): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  const add = (cardId: string) => {
    if (!cardId || seen.has(cardId))
      return
    seen.add(cardId)
    ids.push(cardId)
  }
  for (const widget of widgets) {
    if (widget.kind === 'card') {
      add(widget.cardId)
      continue
    }
    for (const page of widget.pages) {
      for (const item of page.items)
        add(item.cardId)
    }
  }
  return ids
}

export function listGroups(widgets: DashWidget[]): DashGroupWidget[] {
  return widgets.filter((item): item is DashGroupWidget => item.kind === 'group')
}

export function dropMissingCards(
  widgets: DashWidget[],
  cardIds: Iterable<string>,
): DashWidget[] {
  const keep = new Set(cardIds)
  return widgets.flatMap((widget): DashWidget[] => {
    if (widget.kind === 'card')
      return keep.has(widget.cardId) ? [widget] : []
    return [{
      ...widget,
      pages: widget.pages.map(page => ({
        ...page,
        items: page.items.filter(item => keep.has(item.cardId)),
      })),
    }]
  })
}

export function addCardsToRoot(
  widgets: DashWidget[],
  cardIds: string[],
  sizeOf?: (cardId: string) => { w: number, h: number } | undefined,
): DashWidget[] {
  const used = new Set(collectCardIds(widgets))
  let next = widgets
  for (const cardId of cardIds) {
    if (!cardId || used.has(cardId))
      continue
    used.add(cardId)
    next = [...next, { kind: 'card', cardId, ...nextRect(next, sizeOf?.(cardId)) }]
  }
  return next
}

export function addCardsToGroup(
  widgets: DashWidget[],
  cardIds: string[],
  groupId: string,
): DashWidget[] {
  const group = widgets.find((item): item is DashGroupWidget => item.kind === 'group' && item.id === groupId)
  if (!group)
    return addCardsToRoot(widgets, cardIds)
  const used = new Set(collectCardIds(widgets))
  const incoming = cardIds.filter((cardId) => {
    if (!cardId || used.has(cardId))
      return false
    used.add(cardId)
    return true
  })
  if (!incoming.length)
    return widgets
  if (group.mode === 'tabs') {
    const items = incoming.map(cardId => ({ cardId, x: 0, y: 0, w: DASH_COL_NUM, h: DASH_DEFAULT_H }))
    const extra = pagesFromItems('tabs', items)
    return widgets.map((widget) => {
      if (widget.kind !== 'group' || widget.id !== groupId)
        return widget
      const pages = flattenGroupItems(widget).length ? widget.pages : []
      return { ...widget, pages: [...pages, ...extra] }
    })
  }
  const page = group.pages[0] ?? createEmptyPage()
  return widgets.map((widget) => {
    if (widget.kind !== 'group' || widget.id !== groupId)
      return widget
    let items = page.items
    for (const cardId of incoming)
      items = [...items, { cardId, ...nextRect(items) }]
    return { ...widget, pages: [{ ...page, items }] }
  })
}

export function removeCardFromTree(widgets: DashWidget[], cardId: string): DashWidget[] {
  return widgets.flatMap((widget): DashWidget[] => {
    if (widget.kind === 'card')
      return widget.cardId === cardId ? [] : [widget]
    const pages = widget.pages
      .map(page => ({
        ...page,
        items: page.items.filter(item => item.cardId !== cardId),
      }))
      .filter(page => page.items.length)
    return [{
      ...widget,
      pages: pages.length ? pages : [createEmptyPage()],
    }]
  })
}

export function moveCardToRoot(widgets: DashWidget[], cardId: string): DashWidget[] {
  if (!cardId || widgets.some(item => item.kind === 'card' && item.cardId === cardId))
    return widgets
  const stripped = removeCardFromTree(widgets, cardId)
  return [...stripped, { kind: 'card', cardId, ...nextRect(stripped) }]
}

export function moveCardToGroup(
  widgets: DashWidget[],
  cardId: string,
  groupId: string,
): DashWidget[] {
  if (!cardId)
    return widgets
  return addCardsToGroup(removeCardFromTree(widgets, cardId), [cardId], groupId)
}

export function dissolveGroup(widgets: DashWidget[], groupId: string): DashWidget[] {
  const group = widgets.find((item): item is DashGroupWidget => item.kind === 'group' && item.id === groupId)
  if (!group)
    return widgets
  const cardIds = flattenGroupItems(group).map(item => item.cardId)
  const without = widgets.filter(item => !(item.kind === 'group' && item.id === groupId))
  return addCardsToRoot(without, cardIds)
}

export function patchWidgetRect(
  widgets: DashWidget[],
  key: string,
  rect: DashLayoutRect,
): DashWidget[] {
  let changed = false
  const next = widgets.map((widget) => {
    if (widgetKey(widget) !== key || sameRect(widget, rect))
      return widget
    changed = true
    return { ...widget, ...rect }
  })
  return changed ? next : widgets
}

export function patchPageItems(
  widgets: DashWidget[],
  groupId: string,
  pageId: string,
  items: DashPageItem[],
): DashWidget[] {
  return widgets.map((widget) => {
    if (widget.kind !== 'group' || widget.id !== groupId)
      return widget
    return {
      ...widget,
      pages: widget.pages.map(page => page.id === pageId ? { ...page, items } : page),
    }
  })
}

export function replaceGroup(widgets: DashWidget[], next: DashGroupWidget): DashWidget[] {
  return widgets.map(widget => widget.kind === 'group' && widget.id === next.id ? next : widget)
}

function readInt(raw: unknown, fallback: number, min = 0) {
  const n = Number(raw)
  return Number.isFinite(n) ? Math.max(min, Math.round(n)) : fallback
}

function readCardId(raw: unknown) {
  if (raw == null)
    return ''
  const id = String(raw).trim()
  return id && id !== '0' ? id : ''
}

function readRect(raw: Record<string, unknown>, fallback: DashLayoutRect, minW = 1, minH = 1): DashLayoutRect {
  return {
    x: readInt(raw.x, fallback.x),
    y: readInt(raw.y, fallback.y),
    w: readInt(raw.w, fallback.w, minW),
    h: readInt(raw.h, fallback.h, minH),
  }
}

function sanitizePageItems(raw: unknown, used: Set<string>): DashPageItem[] {
  if (!Array.isArray(raw))
    return []
  const items: DashPageItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object')
      continue
    const rec = row as Record<string, unknown>
    if (rec.kind === 'group')
      continue
    const cardId = readCardId(rec.cardId)
    if (!cardId || used.has(cardId))
      continue
    used.add(cardId)
    items.push({
      cardId,
      ...readRect(rec, { x: 0, y: 0, w: DASH_DEFAULT_W, h: DASH_DEFAULT_H }, 1, 1),
    })
  }
  return items
}

function sanitizePages(raw: unknown, used: Set<string>, mode: DashGroupMode): DashGroupPage[] {
  const source = Array.isArray(raw) ? raw : []
  const pages: DashGroupPage[] = []
  const pageIds = new Set<string>()
  for (const row of source) {
    if (!row || typeof row !== 'object')
      continue
    const rec = row as Record<string, unknown>
    let id = String(rec.id || '').trim() || createDashUid('p')
    if (pageIds.has(id))
      id = createDashUid('p')
    pageIds.add(id)
    const title = String(rec.title || '').trim()
    pages.push({
      id,
      ...(title ? { title } : {}),
      items: sanitizePageItems(rec.items, used),
    })
  }
  if (mode === 'tabs') {
    // 一页一卡；自定义页签标题留在该页第一张卡上
    const split: DashGroupPage[] = []
    const usedIds = new Set<string>()
    for (const page of pages) {
      for (const [index, item] of page.items.entries()) {
        let id = index === 0 ? page.id : createDashUid('p')
        if (usedIds.has(id))
          id = createDashUid('p')
        usedIds.add(id)
        split.push({
          id,
          ...(index === 0 && page.title ? { title: page.title } : {}),
          items: [item],
        })
      }
    }
    return split.length ? split : [createEmptyPage()]
  }
  const items = pages.flatMap(page => page.items)
  return [{ id: pages[0]?.id ?? createDashUid('p'), items }]
}

function sanitizeWidget(raw: unknown, used: Set<string>, groupIds: Set<string>): DashWidget | null {
  if (!raw || typeof raw !== 'object')
    return null
  const rec = raw as Record<string, unknown>
  if (rec.kind === 'card') {
    const cardId = readCardId(rec.cardId)
    if (!cardId || used.has(cardId))
      return null
    used.add(cardId)
    return {
      kind: 'card',
      cardId,
      ...readRect(rec, { x: 0, y: 0, w: DASH_DEFAULT_W, h: DASH_DEFAULT_H }, 1, 1),
    }
  }
  if (rec.kind !== 'group')
    return null
  let id = String(rec.id || '').trim() || createDashUid('g')
  if (groupIds.has(id))
    id = createDashUid('g')
  groupIds.add(id)
  const mode: DashGroupMode = rec.mode === 'tabs' ? 'tabs' : 'tile'
  const bg = String(rec.bg || '').trim()
  const color = String(rec.color || '').trim()
  return {
    kind: 'group',
    id,
    title: String(rec.title || '').trim() || '未命名分组',
    description: String(rec.description || ''),
    mode,
    ...(bg ? { bg } : {}),
    ...(color ? { color } : {}),
    ...(rec.showCardTitle === false ? { showCardTitle: false } : {}),
    ...readRect(rec, { x: 0, y: 0, w: DASH_GROUP_DEFAULT_W, h: DASH_GROUP_DEFAULT_H }, 1, 1),
    pages: sanitizePages(rec.pages, used, mode),
  }
}

export function sanitizeWidgets(raw: unknown): DashWidget[] {
  if (!Array.isArray(raw))
    return []
  const used = new Set<string>()
  const groupIds = new Set<string>()
  return raw.flatMap((item) => {
    const widget = sanitizeWidget(item, used, groupIds)
    return widget ? [widget] : []
  })
}
