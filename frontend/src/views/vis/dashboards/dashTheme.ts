import type { LensTheme } from '@/theme/tokens'
import { themeCssVars } from '@/theme/cssVars'
import { THEME_PRESETS } from '@/theme/tokens'

/** 默认主题 / 默认圆角不写进 configJson；预览顶栏换肤只是会话临时覆盖。 */
export type DashThemeId = 't1' | 't2' | 't3' | 't4' | 't5' | 't6'

export interface DashThemePreset {
  id: DashThemeId
  name: string
  theme: LensTheme
}

export const DEFAULT_DASH_THEME: DashThemeId = 't1'

// 保留持久化编号；配色由公共预设提供，业务层只做字段适配。
export const DASH_THEME_PRESETS: DashThemePreset[] = [
  { id: 't1', name: '默认', theme: THEME_PRESETS.default },
  { id: 't2', name: '海军蓝', theme: THEME_PRESETS.navy },
  { id: 't3', name: '象牙纸', theme: THEME_PRESETS.paper },
  { id: 't4', name: '森林绿', theme: THEME_PRESETS.forest },
  { id: 't5', name: '石墨橙', theme: THEME_PRESETS.graphite },
  { id: 't6', name: '深夜', theme: THEME_PRESETS.dark },
]

const THEME_IDS = new Set<DashThemeId>(DASH_THEME_PRESETS.map(item => item.id))

export function resolveDashThemeId(raw?: string): DashThemeId {
  if (raw && THEME_IDS.has(raw as DashThemeId))
    return raw as DashThemeId
  return DEFAULT_DASH_THEME
}

export type DashCardRadiusId = 'none' | 'sm' | 'md' | 'lg' | 'xl'

export interface DashCardRadiusPreset {
  id: DashCardRadiusId
  name: string
  value: number
}

export const DEFAULT_DASH_CARD_RADIUS: DashCardRadiusId = 'md'

export const DASH_CARD_RADIUS_PRESETS: DashCardRadiusPreset[] = [
  { id: 'none', name: '直角', value: 0 },
  { id: 'sm', name: '小', value: 8 },
  { id: 'md', name: '中', value: 12 },
  { id: 'lg', name: '大', value: 16 },
  { id: 'xl', name: '很大', value: 20 },
]

const RADIUS_IDS = new Set<DashCardRadiusId>(DASH_CARD_RADIUS_PRESETS.map(item => item.id))

export function resolveDashCardRadiusId(raw?: string): DashCardRadiusId {
  if (raw && RADIUS_IDS.has(raw as DashCardRadiusId))
    return raw as DashCardRadiusId
  return DEFAULT_DASH_CARD_RADIUS
}

export function resolveDashCardRadiusPx(id?: string) {
  const resolved = resolveDashCardRadiusId(id)
  return DASH_CARD_RADIUS_PRESETS.find(item => item.id === resolved)?.value
    ?? DASH_CARD_RADIUS_PRESETS.find(item => item.id === DEFAULT_DASH_CARD_RADIUS)!.value
}

export function dashThemeSwatchStyle(preset: DashThemePreset) {
  const { theme } = preset
  return {
    background: `linear-gradient(to bottom, ${theme.chrome.surface.panel} 32%, ${theme.surface.panel} 32%)`,
    borderRadius: '6px',
    boxShadow: `inset 0 0 0 1px ${theme.border.light}`,
  }
}

export function resolveDashTheme(id?: string): DashThemePreset {
  const resolved = resolveDashThemeId(id)
  return DASH_THEME_PRESETS.find(item => item.id === resolved) ?? DASH_THEME_PRESETS[0]
}

export function dashThemeVars(id?: string, radiusId?: string): Record<string, string> {
  const { theme } = resolveDashTheme(id)
  return {
    ...themeCssVars(theme),
    '--dash-canvas-bg': theme.surface.page,
    '--dash-card-bg': theme.surface.panel,
    '--dash-chrome-bg': theme.chrome.surface.panel,
    '--dash-card-radius': `${resolveDashCardRadiusPx(radiusId)}px`,
    '--dash-title': theme.heading.color,
    '--dash-content-color': theme.text.strong,
    '--dash-content-muted': theme.text.muted,
    '--dash-accent': theme.primary.base,
    '--dash-border': theme.border.light,
    '--dash-card-blur': 'none',
    '--dash-card-shadow': theme.shadow.panel,
    '--dash-btn-shadow': 'none',
    '--dash-chrome-shadow': `0 1px 0 ${theme.chrome.border.light}`,
  }
}

/** 顶栏独立作用域；反色按钮和筛选不会污染卡片或 Teleport 弹层。 */
export function dashChromeVars(id?: string): Record<string, string> {
  const { chrome } = resolveDashTheme(id).theme
  return {
    ...themeCssVars(chrome),
    '--dash-title': chrome.text.strong,
    '--dash-content-color': chrome.text.strong,
    '--dash-content-muted': chrome.text.muted,
    '--dash-accent': chrome.primary.base,
    '--dash-border': chrome.border.light,
  }
}

/** Teleport 弹层继承所属看板的主题，不修改应用根节点。 */
export function dashOverlayVars(id?: string): Record<string, string> {
  const { theme } = resolveDashTheme(id)
  return {
    ...themeCssVars(theme),
    '--dash-mobile-surface': theme.surface.panel,
    '--dash-mobile-elevated': theme.surface.elevated,
    '--dash-mobile-title': theme.text.strong,
    '--dash-mobile-content': theme.text.regular,
    '--dash-mobile-muted': theme.text.muted,
    '--dash-mobile-border': theme.border.light,
    '--dash-mobile-accent': theme.primary.base,
    '--dash-mobile-soft': theme.surface.subtle,
    '--dash-mobile-lighter': theme.surface.faint,
    '--dash-mobile-popper-shadow': theme.shadow.floating,
    '--dash-mobile-sheet-shadow': theme.shadow.sheet,
    'background': theme.surface.panel,
    'borderColor': theme.border.light,
    'color': theme.text.regular,
  }
}
