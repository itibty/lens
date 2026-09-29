import type { LensTheme } from '@/theme/tokens'
import { themeCssVars } from '@/theme/cssVars'
import { DARK_THEME, LIGHT_THEME } from '@/theme/tokens'

/** 看板主题是浏览器阅读偏好，不写入看板配置。 */
export type DashThemeId = 'light' | 'dark'

export interface DashThemePreset {
  id: DashThemeId
  name: string
  theme: LensTheme
}

export const DEFAULT_DASH_THEME: DashThemeId = 'light'

export const DASH_THEME_PRESETS: DashThemePreset[] = [
  { id: 'light', name: '默认', theme: LIGHT_THEME },
  { id: 'dark', name: '暗色', theme: DARK_THEME },
]

export function resolveDashThemeId(raw: unknown): DashThemeId {
  return raw === 'dark' ? 'dark' : DEFAULT_DASH_THEME
}

export function resolveDashTheme(id?: string): DashThemePreset {
  const resolved = resolveDashThemeId(id)
  return DASH_THEME_PRESETS.find(item => item.id === resolved) ?? DASH_THEME_PRESETS[0]
}

export function dashThemeVars(id?: string): Record<string, string> {
  const preset = resolveDashTheme(id)
  const { theme } = preset
  return {
    ...themeCssVars(theme),
    '--dash-canvas-bg': theme.surface.page,
    '--dash-card-bg': theme.surface.panel,
    '--dash-chrome-bg': theme.chrome.surface.panel,
    '--dash-card-radius': '12px',
    '--dash-title': theme.heading.color,
    '--dash-content-color': theme.text.strong,
    '--dash-content-muted': theme.text.muted,
    '--dash-accent': theme.primary.base,
    '--dash-border': theme.border.light,
    '--dash-card-shadow': theme.shadow.panel,
    '--dash-chrome-shadow': `0 1px 0 ${theme.chrome.border.light}`,
    '--vis-card-border': 'none',
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
