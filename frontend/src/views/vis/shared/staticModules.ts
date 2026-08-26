/**
 * 文本卡模块：读入迁移、编辑器保底、落库裁剪、静态展示适配。
 */
import type {
  VisCalloutModule,
  VisCalloutTone,
  VisProgressModule,
  VisRichtextModule,
  VisStaticModule,
  VisStaticModuleType,
  VisStatItem,
  VisStatModule,
  VisStatsModule,
  VisVisualConfig,
} from './types'
import { formatMetricNumber } from './numberStyle'
import { isValidProgressTarget, resolveProgressViewFromStatic } from './progressCard'

export const STAT_GROUP_MIN = 2
export const STAT_GROUP_MAX = 4

export const STATIC_MODULE_LABELS: Record<VisStaticModuleType, string> = {
  richtext: '富文本',
  stat: '数字',
  stats: '数字组',
  progress: '进度条',
  callout: '提示条',
}

export const STATIC_MODULE_ADD: Array<{ type: VisStaticModuleType, label: string }> = [
  { type: 'richtext', label: STATIC_MODULE_LABELS.richtext },
  { type: 'stat', label: STATIC_MODULE_LABELS.stat },
  { type: 'stats', label: STATIC_MODULE_LABELS.stats },
  { type: 'progress', label: STATIC_MODULE_LABELS.progress },
  { type: 'callout', label: STATIC_MODULE_LABELS.callout },
]

export const CALLOUT_TONE_OPTIONS: Array<{ value: VisCalloutTone, label: string }> = [
  { value: 'info', label: '信息' },
  { value: 'warning', label: '注意' },
  { value: 'success', label: '成功' },
]

export function createModuleUid() {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function isEmptyStaticHtml(raw?: string) {
  if (!raw?.trim())
    return true
  if (/<(?:img|hr|table|video)\b/i.test(raw))
    return false
  const text = raw.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;/gi, ' ').replace(/<[^>]+>/g, '').trim()
  return !text
}

export function createRichtextModule(html?: string): VisRichtextModule {
  const next: VisRichtextModule = { type: 'richtext', _uid: createModuleUid() }
  if (html)
    next.html = html
  return next
}

export function createStatModule(): VisStatModule {
  return {
    type: 'stat',
    value: 1280,
    label: '指标',
    _uid: createModuleUid(),
  }
}

export function createStatsModule(): VisStatsModule {
  return {
    type: 'stats',
    items: [
      { label: '当前', value: 80 },
      { label: '目标', value: 100 },
    ],
    _uid: createModuleUid(),
  }
}

export function createProgressModule(): VisProgressModule {
  return {
    type: 'progress',
    current: 80,
    target: 100,
    _uid: createModuleUid(),
  }
}

export function createCalloutModule(): VisCalloutModule {
  return {
    type: 'callout',
    tone: 'info',
    _uid: createModuleUid(),
  }
}

export function createStaticModule(type: VisStaticModuleType): VisStaticModule {
  switch (type) {
    case 'stat':
      return createStatModule()
    case 'stats':
      return createStatsModule()
    case 'progress':
      return createProgressModule()
    case 'callout':
      return createCalloutModule()
    default:
      return createRichtextModule()
  }
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value))
    return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n))
      return n
  }
  return undefined
}

function takeUid(raw: Record<string, unknown>) {
  return typeof raw._uid === 'string' ? raw._uid : undefined
}

function takeText(raw: unknown) {
  return typeof raw === 'string' ? raw.trim() : ''
}

function normalizeStatItem(raw: unknown): VisStatItem | null {
  if (!raw || typeof raw !== 'object')
    return null
  const rec = raw as Record<string, unknown>
  const value = asFiniteNumber(rec.value)
  if (value == null)
    return null
  const next: VisStatItem = { value }
  const label = takeText(rec.label)
  const prefix = takeText(rec.prefix)
  if (label)
    next.label = label
  if (prefix)
    next.prefix = prefix
  return next
}

function normalizeCalloutTone(raw: unknown): VisCalloutTone {
  if (raw === 'warning' || raw === 'success')
    return raw
  return 'info'
}

function normalizeModule(raw: unknown): VisStaticModule | null {
  if (!raw || typeof raw !== 'object')
    return null
  const rec = raw as Record<string, unknown>
  const type = String(rec.type || '').toLowerCase()
  const uid = takeUid(rec)
  if (type === 'richtext') {
    const html = typeof rec.html === 'string' ? rec.html : undefined
    const next: VisRichtextModule = { type: 'richtext' }
    if (uid)
      next._uid = uid
    if (html)
      next.html = html
    return next
  }
  if (type === 'stat') {
    const item = normalizeStatItem(rec)
    if (!item)
      return null
    return uid ? { type: 'stat', ...item, _uid: uid } : { type: 'stat', ...item }
  }
  if (type === 'stats') {
    const items = Array.isArray(rec.items)
      ? rec.items.map(normalizeStatItem).filter((item): item is VisStatItem => !!item)
      : []
    if (items.length < STAT_GROUP_MIN)
      return null
    const next: VisStatsModule = { type: 'stats', items: items.slice(0, STAT_GROUP_MAX) }
    if (uid)
      next._uid = uid
    return next
  }
  if (type === 'progress') {
    const current = asFiniteNumber(rec.current)
    const target = asFiniteNumber(rec.target)
    if (current == null || target == null)
      return null
    const next: VisProgressModule = { type: 'progress', current, target }
    if (uid)
      next._uid = uid
    const label = takeText(rec.label)
    if (label)
      next.label = label
    return next
  }
  if (type === 'callout') {
    const next: VisCalloutModule = { type: 'callout', tone: normalizeCalloutTone(rec.tone) }
    if (uid)
      next._uid = uid
    const title = takeText(rec.title)
    const text = takeText(rec.text)
    if (title)
      next.title = title
    if (text)
      next.text = text
    return next
  }
  return null
}

export function resolveStaticModules(visual?: VisVisualConfig): VisStaticModule[] {
  const rt = visual?.richtext
  if (!rt)
    return []
  if (Array.isArray(rt.modules) && rt.modules.length) {
    const list: VisStaticModule[] = []
    for (const item of rt.modules) {
      const next = normalizeModule(item)
      if (next)
        list.push(next)
    }
    return list
  }
  if (rt.html?.trim())
    return [{ type: 'richtext', html: rt.html }]
  return []
}

export function moduleHasContent(mod: VisStaticModule) {
  if (mod.type === 'richtext')
    return !isEmptyStaticHtml(mod.html)
  if (mod.type === 'stat')
    return Number.isFinite(mod.value)
  if (mod.type === 'stats')
    return (mod.items ?? []).filter(item => Number.isFinite(item.value)).length >= STAT_GROUP_MIN
  if (mod.type === 'progress')
    return Number.isFinite(mod.current) && isValidProgressTarget(mod.target)
  return !!(mod.title?.trim() || mod.text?.trim())
}

export function hasStaticModulesContent(visual?: VisVisualConfig) {
  return resolveStaticModules(visual).some(moduleHasContent)
}

export function staticModulesError(visual?: VisVisualConfig) {
  if (hasStaticModulesContent(visual))
    return null
  return '请输入正文或添加内容模块'
}

/** 读卡时把旧 html 收成 modules，不造空模块 */
export function adoptRichtextModules(visual: VisVisualConfig) {
  if (String(visual.chartType || '').toLowerCase() !== 'richtext')
    return
  const rt = visual.richtext
  if (rt?.modules?.length)
    return
  const migrated = resolveStaticModules(visual)
  if (migrated.length)
    visual.richtext = { modules: migrated }
}

/** 编辑器：把旧 html 写进 modules；空卡给一段空富文本 */
export function ensureRichtextModules(visual: VisVisualConfig): VisStaticModule[] {
  const rt = visual.richtext
  if (rt?.modules?.length) {
    for (const item of rt.modules) {
      if (!item._uid)
        item._uid = createModuleUid()
    }
    return rt.modules
  }
  const migrated = resolveStaticModules(visual).map((item) => {
    if (!item._uid)
      item._uid = createModuleUid()
    return item
  })
  const modules = migrated.length ? migrated : [createRichtextModule()]
  visual.richtext = { modules }
  return modules
}

function pruneStatItem(item: VisStatItem): VisStatItem | null {
  if (!Number.isFinite(item.value))
    return null
  const next: VisStatItem = { value: item.value }
  const label = item.label?.trim()
  const prefix = item.prefix?.trim()
  if (label)
    next.label = label
  if (prefix)
    next.prefix = prefix
  return next
}

function pruneModule(mod: VisStaticModule): VisStaticModule | null {
  if (mod.type === 'richtext') {
    if (isEmptyStaticHtml(mod.html))
      return null
    return { type: 'richtext', html: mod.html }
  }
  if (mod.type === 'stat') {
    const item = pruneStatItem(mod)
    return item ? { type: 'stat', ...item } : null
  }
  if (mod.type === 'stats') {
    const items = (mod.items ?? [])
      .map(pruneStatItem)
      .filter((item): item is VisStatItem => !!item)
      .slice(0, STAT_GROUP_MAX)
    if (items.length < STAT_GROUP_MIN)
      return null
    return { type: 'stats', items }
  }
  if (mod.type === 'progress') {
    if (!Number.isFinite(mod.current) || !isValidProgressTarget(mod.target))
      return null
    const next: VisProgressModule = {
      type: 'progress',
      current: mod.current,
      target: mod.target,
    }
    const label = mod.label?.trim()
    if (label)
      next.label = label
    return next
  }
  const title = mod.title?.trim()
  const text = mod.text?.trim()
  if (!title && !text)
    return null
  const next: VisCalloutModule = { type: 'callout' }
  if (mod.tone === 'warning' || mod.tone === 'success')
    next.tone = mod.tone
  if (title)
    next.title = title
  if (text)
    next.text = text
  return next
}

export function pruneRichtextConfig(visual: VisVisualConfig) {
  const modules = resolveStaticModules(visual)
    .map(pruneModule)
    .filter((item): item is VisStaticModule => !!item)
  if (!modules.length)
    delete visual.richtext
  else
    visual.richtext = { modules }
}

export function staticProgressVisual(parent: VisVisualConfig, hasLabel: boolean): VisVisualConfig {
  return {
    chartType: 'progress',
    cardColor: parent.cardColor,
    cardBg: parent.cardBg,
    progress: {
      shape: 'bar',
      showPercent: true,
      showValue: true,
      showLabel: hasLabel,
      size: 'sm',
    },
  }
}

export function staticProgressView(mod: VisProgressModule, visual?: VisVisualConfig) {
  return resolveProgressViewFromStatic(mod.current, mod.target, mod.label, visual)
}

export function formatStaticStat(item: VisStatItem) {
  const parts = formatMetricNumber(item.value, {
    decimals: 'auto',
    separator: true,
    compact: false,
  })
  return {
    label: item.label?.trim() ?? '',
    prefix: item.prefix?.trim() ?? '',
    body: parts.body,
    suffix: parts.compactSuffix,
    empty: parts.empty,
  }
}

export function resolveCalloutTone(tone?: string): VisCalloutTone {
  return tone === 'warning' || tone === 'success' ? tone : 'info'
}
