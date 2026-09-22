import { UIConfig } from '@/core/config'
import { CacheKeyNameEnum, storageUtil } from '@/utils/cache'
import { DARK_THEME, LIGHT_THEME, mixColor, NAVBAR_COLORS } from './tokens'

interface ChromeColors {
  navbar: {
    background: string
    title: string
    text: string
    hover: string
    border: string
    brand: string
  }
  sidebar: {
    background: string
    text: string
    muted: string
    hover: string
    hoverText: string
    active: string
    activeText: string
    border: string
    inputBorder: string
  }
}

const classic: ChromeColors = {
  navbar: { ...NAVBAR_COLORS, brand: DARK_THEME.primary.base },
  sidebar: {
    background: LIGHT_THEME.surface.panel,
    text: LIGHT_THEME.text.strong,
    muted: LIGHT_THEME.text.muted,
    hover: LIGHT_THEME.surface.panel,
    hoverText: LIGHT_THEME.primary.base,
    active: mixColor(LIGHT_THEME.primary.base, LIGHT_THEME.surface.panel, 0.1),
    activeText: LIGHT_THEME.primary.base,
    border: LIGHT_THEME.border.subtle,
    inputBorder: LIGHT_THEME.border.normal,
  },
}

// 系统导航配色独立于 THEME_PRESETS；不修改内容区、按钮或图表色。
export const CHROME_THEMES = {
  classic: { name: '经典', ...classic },
  light: {
    name: '明亮',
    navbar: {
      background: '#F8FAFC',
      title: '#1F2937',
      text: '#475467',
      hover: '#F2F4F7',
      border: '#E4E7EC',
      brand: LIGHT_THEME.primary.base,
    },
    sidebar: {
      background: '#F8FAFC',
      text: '#475467',
      muted: '#667085',
      hover: '#EEF2F7',
      hoverText: '#0052D9',
      active: '#E4EDFC',
      activeText: '#0052D9',
      border: '#E4E7EC',
      inputBorder: '#D0D5DD',
    },
  },
  navy: {
    name: '墨蓝',
    navbar: {
      background: '#142C49',
      title: '#F4F7FB',
      text: '#C6D3E2',
      hover: '#294564',
      border: '#142C49',
      brand: '#A9C9FF',
    },
    sidebar: {
      background: '#1B3553',
      text: '#D4DFEC',
      muted: '#B1C1D5',
      hover: '#274361',
      hoverText: '#FFFFFF',
      active: '#2D5079',
      activeText: '#FFFFFF',
      border: '#314B68',
      inputBorder: '#526B87',
    },
  },
} satisfies Record<string, ChromeColors & { name: string }>

export type ChromeThemeId = keyof typeof CHROME_THEMES
export const DEFAULT_CHROME_THEME: ChromeThemeId = 'classic'

export function resolveChromeTheme(value: unknown): ChromeThemeId {
  return UIConfig.appearanceEnabled && typeof value === 'string' && Object.hasOwn(CHROME_THEMES, value)
    ? value as ChromeThemeId
    : DEFAULT_CHROME_THEME
}

export function readChromeTheme(): ChromeThemeId {
  try {
    return resolveChromeTheme(storageUtil.get(CacheKeyNameEnum.chromeTheme))
  }
  catch {
    return DEFAULT_CHROME_THEME
  }
}

export function saveChromeTheme(value: ChromeThemeId) {
  try {
    const id = resolveChromeTheme(value)
    if (id === DEFAULT_CHROME_THEME)
      storageUtil.del(CacheKeyNameEnum.chromeTheme)
    else
      storageUtil.set(CacheKeyNameEnum.chromeTheme, id)
  }
  catch {
    // 浏览器禁用存储时仍允许在当前页面切换。
  }
}

export function chromeCssVars(id: ChromeThemeId): Record<string, string> {
  const { navbar, sidebar } = CHROME_THEMES[id]
  return {
    '--na-navbar-bg': navbar.background,
    '--na-navbar-title-color': navbar.title,
    '--na-navbar-text-color': navbar.text,
    '--na-navbar-hover-text-color': navbar.title,
    '--na-navbar-hover-bg': navbar.hover,
    '--na-navbar-border-color': navbar.border,
    '--na-navbar-brand-color': navbar.brand,
    '--na-sidebar-bg': sidebar.background,
    '--na-sidebar-text': sidebar.text,
    '--na-sidebar-muted': sidebar.muted,
    '--na-sidebar-hover-bg': sidebar.hover,
    '--na-sidebar-hover-text': sidebar.hoverText,
    '--na-sidebar-active-bg': sidebar.active,
    '--na-sidebar-active-text': sidebar.activeText,
    '--na-sidebar-border': sidebar.border,
    '--na-sidebar-input-border': sidebar.inputBorder,
  }
}

export function applyChromeTheme(value: ChromeThemeId) {
  const id = resolveChromeTheme(value)
  // 仅覆盖导航变量；内联变量优先于懒加载的第三方样式。
  for (const [key, color] of Object.entries(chromeCssVars(id)))
    document.documentElement.style.setProperty(key, color)
}
