/** 公共配色来源。DOM、Element Plus 和 Canvas 都消费这里的语义，不在组件中另定默认颜色。 */
export type ThemeMode = 'light' | 'dark'

export const NEUTRAL = {
  white: '#FFFFFF',
  black: '#000000',
  page: '#F5F7FA',
  subtle: '#F2F4F7',
  hover: '#EAECF0',
  faint: '#F8FAFC',
  strong: '#1F2937',
  regular: '#475467',
  muted: '#667085',
  disabled: '#98A2B3',
  border: '#D0D5DD',
  borderLight: '#E4E7EC',
  borderSubtle: '#EDF0F4',
} as const

export const ACCENT = {
  blue: '#0052D9',
  green: '#18794E',
  orange: '#946200',
  red: '#C0353B',
  cyan: '#087F8C',
  purple: '#7155A5',
} as const

/** 数据分类色不承担成功/失败语义；数组顺序是稳定的系列顺序。 */
export const DATA_SERIES = ['#4263C7', '#348D9C', '#C08A45', '#7A6BB3', '#588B78', '#A77086', '#607B9A', '#A29460']

export function mixColor(color: string, background: string, weight: number) {
  const channels = (hex: string) => [1, 3, 5].map(start => Number.parseInt(hex.slice(start, start + 2), 16))
  const front = channels(color)
  const back = channels(background)
  return `#${front.map((value, index) => Math.round(value * weight + back[index] * (1 - weight)).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function alphaColor(color: string, opacity: number) {
  const rgb = [1, 3, 5].map(start => Number.parseInt(color.slice(start, start + 2), 16))
  return `rgba(${rgb.join(', ')}, ${opacity})`
}

export interface ThemePaint {
  base: string
  hover: string
  active: string
  soft: string
  border: string
  on: string
}

export interface LensTheme {
  mode: ThemeMode
  primary: ThemePaint
  surface: { page: string, panel: string, elevated: string, subtle: string, hover: string, faint: string }
  text: { strong: string, regular: string, muted: string, disabled: string }
  border: { normal: string, light: string, subtle: string }
  heading: { background: string, color: string, border: string }
  status: Record<'success' | 'warning' | 'danger' | 'info', ThemePaint>
  chart: { series: string[], axis: string, grid: string, track: string }
  shadow: { panel: string, floating: string, sheet: string }
}

export function createTheme(mode: ThemeMode = 'light', accent: string = mode === 'dark' ? '#75ABFF' : ACCENT.blue, page?: string): LensTheme {
  const dark = mode === 'dark'
  const surface = dark
    ? { page: '#10151D', panel: '#1B222C', elevated: '#222B36', subtle: '#252E39', hover: '#2D3948', faint: '#202832' }
    : { page: NEUTRAL.page, panel: NEUTRAL.white, elevated: NEUTRAL.white, subtle: NEUTRAL.subtle, hover: NEUTRAL.hover, faint: NEUTRAL.faint }
  const text = dark
    ? { strong: '#F2F5F9', regular: '#D8E0EC', muted: '#A7B3C4', disabled: '#778396' }
    : { strong: NEUTRAL.strong, regular: NEUTRAL.regular, muted: NEUTRAL.muted, disabled: NEUTRAL.disabled }
  const paint = (base: string): ThemePaint => ({
    base,
    hover: mixColor(base, dark ? NEUTRAL.white : NEUTRAL.black, 0.86),
    active: mixColor(base, dark ? NEUTRAL.white : NEUTRAL.black, 0.76),
    soft: mixColor(base, surface.panel, dark ? 0.16 : 0.08),
    border: mixColor(base, surface.panel, 0.3),
    on: dark ? surface.page : NEUTRAL.white,
  })
  return {
    mode,
    primary: paint(accent),
    surface: { ...surface, page: page ?? surface.page },
    text,
    border: dark
      ? { normal: '#465365', light: '#34404D', subtle: '#2B3542' }
      : { normal: NEUTRAL.border, light: NEUTRAL.borderLight, subtle: NEUTRAL.borderSubtle },
    heading: {
      background: dark ? surface.subtle : surface.panel,
      color: text.strong,
      border: dark ? '#34404D' : surface.panel,
    },
    status: {
      success: paint(dark ? '#75CCA1' : ACCENT.green),
      warning: paint(dark ? '#E4B76F' : ACCENT.orange),
      danger: paint(dark ? '#F18A91' : ACCENT.red),
      info: paint(text.muted),
    },
    chart: {
      series: dark ? DATA_SERIES.map(color => mixColor(color, NEUTRAL.white, 0.72)) : [...DATA_SERIES],
      axis: text.muted,
      grid: dark ? '#34404D' : NEUTRAL.borderSubtle,
      track: dark ? alphaColor(NEUTRAL.white, 0.06) : alphaColor(NEUTRAL.black, 0.025),
    },
    shadow: dark
      ? { panel: '0 1px 2px rgb(0 0 0 / 20%)', floating: '0 8px 24px rgb(0 0 0 / 28%)', sheet: '0 -8px 24px rgb(0 0 0 / 28%)' }
      : { panel: '0 1px 2px rgb(15 23 42 / 4%), 0 4px 12px rgb(15 23 42 / 2%)', floating: '0 8px 24px rgb(15 23 42 / 10%)', sheet: '0 -8px 24px rgb(15 23 42 / 10%)' },
  }
}

export const LIGHT_THEME = createTheme()
export const DARK_THEME = createTheme('dark')

/** 彩色主题由同一套比例生成画布、标题区和边框；数据内容区仍采用中性表面。 */
function createTintedTheme(accent: string): LensTheme {
  const theme = createTheme('light', accent, mixColor(accent, NEUTRAL.white, 0.13))
  return {
    ...theme,
    text: { ...theme.text, muted: mixColor(NEUTRAL.muted, NEUTRAL.strong, 0.82) },
    border: {
      normal: mixColor(accent, NEUTRAL.white, 0.28),
      light: mixColor(accent, NEUTRAL.white, 0.2),
      subtle: mixColor(accent, NEUTRAL.white, 0.1),
    },
    heading: {
      background: mixColor(accent, NEUTRAL.white, 0.075),
      color: mixColor(accent, NEUTRAL.strong, 0.48),
      border: mixColor(accent, NEUTRAL.white, 0.16),
    },
  }
}

export const THEME_PRESETS = {
  default: LIGHT_THEME,
  blue: createTintedTheme(ACCENT.blue),
  warm: createTintedTheme(ACCENT.orange),
  green: createTintedTheme(ACCENT.green),
  purple: createTintedTheme(ACCENT.purple),
  dark: DARK_THEME,
}

export const NAVBAR_COLORS = {
  background: '#20242A',
  text: '#D0D5DD',
  title: NEUTRAL.white,
  border: alphaColor(NEUTRAL.white, 0.08),
  hover: alphaColor(NEUTRAL.white, 0.08),
}
