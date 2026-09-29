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
  popover: {
    background: string
    strong: string
    text: string
    muted: string
    tile: string
    hover: string
    active: string
    accent: string
    border: string
    shadow: string
  }
}

const lightPopover: ChromeColors['popover'] = {
  background: LIGHT_THEME.surface.elevated,
  strong: LIGHT_THEME.text.strong,
  text: LIGHT_THEME.text.regular,
  muted: LIGHT_THEME.text.muted,
  tile: LIGHT_THEME.surface.faint,
  hover: LIGHT_THEME.surface.subtle,
  active: mixColor(LIGHT_THEME.primary.base, LIGHT_THEME.surface.panel, 0.1),
  accent: LIGHT_THEME.primary.base,
  border: LIGHT_THEME.border.light,
  shadow: LIGHT_THEME.shadow.floating,
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
  popover: lightPopover,
}

// 系统导航配色独立于看板主题；不修改内容区、按钮或图表色。
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
    popover: lightPopover,
  },
  gold: {
    name: '墨金',
    navbar: {
      background: '#18191B',
      title: '#E8D5AF',
      text: '#C8C2B8',
      hover: '#2C2923',
      border: '#423A2C',
      brand: '#D8BB82',
    },
    sidebar: {
      background: '#202123',
      text: '#D1CCC3',
      muted: '#A8A196',
      hover: '#2D2B27',
      hoverText: '#E8D5AF',
      active: '#3A3225',
      activeText: '#E8CB91',
      border: '#38352F',
      inputBorder: '#5B5549',
    },
    popover: {
      background: '#202123',
      strong: '#E8E3DA',
      text: '#D1CCC3',
      muted: '#A8A196',
      tile: '#262729',
      hover: '#2D2B27',
      active: '#3A3225',
      accent: '#E8CB91',
      border: '#423A2C',
      shadow: DARK_THEME.shadow.floating,
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
  const { navbar, sidebar, popover } = CHROME_THEMES[id]
  return {
    '--na-navbar-bg': navbar.background,
    '--na-navbar-title-color': navbar.title,
    '--na-navbar-text-color': navbar.text,
    '--na-navbar-hover-text-color': navbar.title,
    '--na-navbar-hover-bg': navbar.hover,
    '--na-navbar-border-color': navbar.border,
    '--na-navbar-brand-color': navbar.brand,
    '--na-navbar-popover-bg': popover.background,
    '--na-navbar-popover-strong': popover.strong,
    '--na-navbar-popover-text': popover.text,
    '--na-navbar-popover-muted': popover.muted,
    '--na-navbar-popover-tile': popover.tile,
    '--na-navbar-popover-hover': popover.hover,
    '--na-navbar-popover-active': popover.active,
    '--na-navbar-popover-accent': popover.accent,
    '--na-navbar-popover-border': popover.border,
    '--na-navbar-popover-shadow': popover.shadow,
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
