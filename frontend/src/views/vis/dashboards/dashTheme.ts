/** 默认主题 / 默认圆角不写进 configJson；预览顶栏换肤只是会话临时覆盖。 */
export type DashThemeId = 't1' | 't2' | 't3' | 't4' | 't5'

export interface DashThemeTokens {
  canvas: string
  card: string
  title: string
  accent: string
  border: string
  btnBg: string
  radius: number
}

export interface DashThemePreset {
  id: DashThemeId
  name: string
  tokens: DashThemeTokens
}

export const DEFAULT_DASH_THEME: DashThemeId = 't1'

export const DASH_THEME_PRESETS: DashThemePreset[] = [
  {
    id: 't1',
    name: '默认',
    tokens: {
      canvas: '#f3f4f6',
      card: '#ffffff',
      title: '#1f2329',
      accent: '#3370ff',
      border: '#e5e7eb',
      btnBg: '#ffffff',
      radius: 12,
    },
  },
  {
    id: 't2',
    name: '蓝',
    tokens: {
      canvas: '#c5dbf4',
      card: '#f3f8fd',
      title: '#143a6b',
      accent: '#1a6fd6',
      border: '#8fb0d4',
      btnBg: '#f3f8fd',
      radius: 16,
    },
  },
  {
    id: 't3',
    name: '暖',
    tokens: {
      canvas: '#edd09a',
      card: '#fff4e4',
      title: '#5a2f10',
      accent: '#d06214',
      border: '#d0a66a',
      btnBg: '#fff4e4',
      radius: 18,
    },
  },
  {
    id: 't4',
    name: '绿',
    tokens: {
      canvas: '#b7e0c4',
      card: '#eef8f1',
      title: '#14532d',
      accent: '#17803d',
      border: '#7dbe90',
      btnBg: '#eef8f1',
      radius: 16,
    },
  },
  {
    id: 't5',
    name: '紫',
    tokens: {
      canvas: '#ddd4f0',
      card: '#f6f3fb',
      title: '#3b1d6e',
      accent: '#7c3aed',
      border: '#b8a4d8',
      btnBg: '#f6f3fb',
      radius: 16,
    },
  },
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

export function dashThemeSwatchRadius(radius: number) {
  return Math.max(4, Math.round(radius / 2))
}

export function resolveDashTheme(id?: string): DashThemePreset {
  const resolved = resolveDashThemeId(id)
  return DASH_THEME_PRESETS.find(item => item.id === resolved) ?? DASH_THEME_PRESETS[0]
}

const SOLID_SHADOW = '0 1px 2px rgb(15 23 42 / 4%)'

function surfaceVars(): Record<string, string> {
  return {
    '--dash-card-blur': 'none',
    '--dash-card-shadow': SOLID_SHADOW,
    '--dash-btn-shadow': SOLID_SHADOW,
    '--dash-chrome-shadow': '0 1px 0 color-mix(in srgb, var(--dash-border, #e5e7eb) 85%, transparent)',
  }
}

export function dashThemeVars(id?: string, radiusId?: string): Record<string, string> {
  const { tokens } = resolveDashTheme(id)
  return {
    '--dash-canvas-bg': tokens.canvas,
    '--dash-card-bg': tokens.card,
    '--dash-card-header-bg': 'transparent',
    '--dash-card-header-color': '#1f2329',
    '--dash-card-radius': `${resolveDashCardRadiusPx(radiusId)}px`,
    '--dash-title': tokens.title,
    '--dash-accent': tokens.accent,
    '--dash-border': tokens.border,
    '--dash-btn-bg': tokens.btnBg,
    ...surfaceVars(),
  }
}
