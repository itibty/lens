import type { LensTheme, ThemeMode } from '@/theme/tokens'
import { themeCssVars } from '@/theme/cssVars'
import { THEME_PRESETS } from '@/theme/tokens'

/** 默认主题 / 默认圆角不写进 configJson；预览顶栏换肤只是会话临时覆盖。 */
export type DashThemeId = 't1' | 't2' | 't3' | 't4' | 't5' | 't6'
export type DashSurfaceMode = ThemeMode

export interface DashThemeTokens {
  canvas: string
  card: string
  title: string
  accent: string
  border: string
  btnBg: string
  radius: number
  mode?: DashSurfaceMode
  content?: string
  muted?: string
}

export interface DashThemePreset {
  id: DashThemeId
  name: string
  tokens: DashThemeTokens
  theme: LensTheme
}

export const DEFAULT_DASH_THEME: DashThemeId = 't1'

function dashboardPreset(id: DashThemeId, name: string, theme: LensTheme): DashThemePreset {
  return {
    id,
    name,
    theme,
    tokens: {
      canvas: theme.surface.page,
      card: theme.surface.panel,
      title: theme.heading.color,
      accent: theme.primary.base,
      border: theme.border.light,
      btnBg: theme.surface.elevated,
      radius: 12,
      mode: theme.mode,
      content: theme.text.regular,
      muted: theme.text.muted,
    },
  }
}

// 保留持久化编号；配色由公共预设提供，业务层只做字段适配。
export const DASH_THEME_PRESETS: DashThemePreset[] = [
  dashboardPreset('t1', '简白', THEME_PRESETS.default),
  dashboardPreset('t2', '雾蓝', THEME_PRESETS.blue),
  dashboardPreset('t3', '暖砂', THEME_PRESETS.warm),
  dashboardPreset('t4', '松绿', THEME_PRESETS.green),
  dashboardPreset('t5', '暮紫', THEME_PRESETS.purple),
  dashboardPreset('t6', '深夜', THEME_PRESETS.dark),
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
  const { theme, tokens } = preset
  return {
    background: `linear-gradient(to bottom, ${theme.heading.background} 32%, ${tokens.card} 32%)`,
    borderRadius: `${Math.max(4, Math.round(tokens.radius / 2))}px`,
    boxShadow: `inset 0 0 0 1px ${theme.border.light}`,
  }
}

export function resolveDashTheme(id?: string): DashThemePreset {
  const resolved = resolveDashThemeId(id)
  return DASH_THEME_PRESETS.find(item => item.id === resolved) ?? DASH_THEME_PRESETS[0]
}

export function resolveDashSurfaceMode(id?: string): DashSurfaceMode {
  return resolveDashTheme(id).tokens.mode ?? 'light'
}

export function dashThemeVars(id?: string, radiusId?: string): Record<string, string> {
  const { tokens, theme } = resolveDashTheme(id)
  return {
    ...themeCssVars(theme),
    '--dash-canvas-bg': tokens.canvas,
    '--dash-card-bg': tokens.card,
    '--dash-card-header-bg': theme.heading.background,
    '--dash-card-header-border': theme.heading.border,
    '--dash-chrome-bg': theme.heading.background,
    '--dash-card-header-color': tokens.title,
    '--dash-card-radius': `${resolveDashCardRadiusPx(radiusId)}px`,
    '--dash-title': tokens.title,
    '--dash-content-color': theme.text.strong,
    '--dash-content-muted': theme.text.muted,
    '--dash-surface-mode': theme.mode,
    '--dash-accent': tokens.accent,
    '--dash-border': tokens.border,
    '--dash-btn-bg': tokens.btnBg,
    '--dash-card-blur': 'none',
    '--dash-card-shadow': theme.shadow.panel,
    '--dash-btn-shadow': 'none',
    '--dash-chrome-shadow': `0 1px 0 ${theme.heading.border}`,
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
