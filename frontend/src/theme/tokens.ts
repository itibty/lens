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

/** 蓝 / 青绿 / 紫 / 琥珀优先；更多分类再使用扩展色。顺序稳定，不承担成功 / 失败语义。 */
export const DATA_SERIES = ['#4F6BED', '#0D9488', '#8B5CF6', '#D97706', '#0284C7', '#DB2777', '#64748B', '#65A30D']

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

export interface ThemeColors {
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

/** 页面顶栏可以采用反色，卡片与数据表面独立保持可读。 */
export interface LensTheme extends ThemeColors {
  chrome: ThemeColors
}

export type ThemeInput = ThemeColors | boolean

function paintColor(base: string, mode: ThemeMode, panel: string, page: string): ThemePaint {
  const dark = mode === 'dark'
  return {
    base,
    hover: mixColor(base, dark ? NEUTRAL.white : NEUTRAL.black, 0.86),
    active: mixColor(base, dark ? NEUTRAL.white : NEUTRAL.black, 0.76),
    soft: mixColor(base, panel, dark ? 0.16 : 0.08),
    border: mixColor(base, panel, 0.3),
    on: dark ? page : NEUTRAL.white,
  }
}

function createThemeColors(mode: ThemeMode = 'light', accent: string = mode === 'dark' ? '#75ABFF' : ACCENT.blue, page?: string): ThemeColors {
  const dark = mode === 'dark'
  const surface = dark
    ? { page: '#10151D', panel: '#1B222C', elevated: '#222B36', subtle: '#252E39', hover: '#2D3948', faint: '#202832' }
    : { page: NEUTRAL.page, panel: NEUTRAL.white, elevated: NEUTRAL.white, subtle: NEUTRAL.subtle, hover: NEUTRAL.hover, faint: NEUTRAL.faint }
  const text = dark
    ? { strong: '#F2F5F9', regular: '#D8E0EC', muted: '#A7B3C4', disabled: '#778396' }
    : { strong: NEUTRAL.strong, regular: NEUTRAL.regular, muted: NEUTRAL.muted, disabled: NEUTRAL.disabled }
  const paint = (base: string) => paintColor(base, mode, surface.panel, page ?? surface.page)
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

export function createTheme(mode: ThemeMode = 'light', accent?: string, page?: string): LensTheme {
  const colors = createThemeColors(mode, accent, page)
  return { ...colors, chrome: colors }
}

export const LIGHT_THEME = createTheme()
export const DARK_THEME = createTheme('dark')

/** 兼容独立卡片原有的明暗参数，嵌入看板时消费完整主题。 */
export function resolveThemeColors(input: ThemeInput = false): ThemeColors {
  return typeof input === 'boolean' ? input ? DARK_THEME : LIGHT_THEME : input
}

interface ColorRecipe {
  mode?: ThemeMode
  accent: string
  page: string
  panel: string
  heading: string
  ink: string
  muted: string
  border: string
  series: string[]
}

/** 只在公共层生成交互色阶；各方案明确指定大面积表面和分类色。 */
function recipeColors(recipe: ColorRecipe): ThemeColors {
  const mode = recipe.mode ?? 'light'
  const base = createThemeColors(mode, recipe.accent, recipe.page)
  const paint = (color: string) => ({
    ...paintColor(color, mode, recipe.panel, recipe.page),
    soft: mixColor(color, recipe.panel, mode === 'dark' ? 0.07 : 0.04),
  })
  // 语义色在同一明暗模式下保持一致，给象牙底和森林绿顶栏留出文字对比度。
  const statusPaint = (color: string) => paint(mixColor(color, mode === 'dark' ? NEUTRAL.white : NEUTRAL.black, mode === 'dark' ? 0.7 : 0.9))
  return {
    ...base,
    primary: paint(recipe.accent),
    surface: {
      page: recipe.page,
      panel: recipe.panel,
      elevated: recipe.panel,
      subtle: recipe.heading,
      hover: mixColor(recipe.accent, recipe.panel, 0.1),
      faint: mixColor(recipe.ink, recipe.panel, 0.025),
    },
    text: {
      strong: recipe.ink,
      regular: mixColor(recipe.muted, recipe.ink, 0.6),
      muted: recipe.muted,
      disabled: mixColor(recipe.muted, recipe.panel, 0.65),
    },
    border: {
      normal: mixColor(recipe.ink, recipe.panel, 0.25),
      light: recipe.border,
      subtle: mixColor(recipe.ink, recipe.panel, 0.08),
    },
    heading: { background: recipe.heading, color: recipe.ink, border: recipe.heading },
    status: {
      success: statusPaint(base.status.success.base),
      warning: statusPaint(base.status.warning.base),
      danger: statusPaint(base.status.danger.base),
      info: paint(recipe.muted),
    },
    chart: {
      series: [...recipe.series],
      axis: recipe.muted,
      grid: mixColor(recipe.ink, recipe.panel, 0.08),
      track: alphaColor(recipe.ink, mode === 'dark' ? 0.06 : 0.025),
    },
  }
}

function classicTheme(recipe: ColorRecipe, chrome?: {
  mode: ThemeMode
  background: string
  ink: string
  muted: string
  accent: string
}): LensTheme {
  const colors = recipeColors(recipe)
  if (!chrome)
    return { ...colors, chrome: colors }
  return {
    ...colors,
    chrome: recipeColors({
      ...recipe,
      mode: chrome.mode,
      accent: chrome.accent,
      page: chrome.background,
      panel: chrome.background,
      heading: mixColor(chrome.ink, chrome.background, 0.07),
      ink: chrome.ink,
      muted: chrome.muted,
      border: mixColor(chrome.ink, chrome.background, 0.14),
    }),
  }
}

export const THEME_PRESETS = {
  default: classicTheme({
    accent: '#2563EB',
    page: '#F3F4F6',
    panel: '#FFFFFF',
    heading: '#FFFFFF',
    ink: '#20242B',
    muted: '#626A76',
    border: '#E4E7EC',
    series: [...DATA_SERIES],
  }),
  navy: classicTheme({
    accent: '#245AA5',
    page: '#E6EDF5',
    panel: '#FFFFFF',
    heading: '#EDF3FA',
    ink: '#22354A',
    muted: '#5A697E',
    border: '#D9E2ED',
    series: ['#326BC4', '#1E827C', '#AD7928', '#8064A4', '#3E83A8', '#AC5674', '#64748B', '#6C8239'],
  }, { mode: 'dark', background: '#142C49', ink: '#F4F7FB', muted: '#C6D3E2', accent: '#A9C9FF' }),
  paper: classicTheme({
    accent: '#863F48',
    page: '#E8DFD0',
    panel: '#FFFCF4',
    heading: '#F6F0E3',
    ink: '#453B31',
    muted: '#6A5E50',
    border: '#DCD2C0',
    series: ['#944656', '#367F7A', '#A47A2C', '#617C9E', '#80639A', '#AD633C', '#687B4F', '#697378'],
  }, { mode: 'light', background: '#F3EBDC', ink: '#453B31', muted: '#6A5E50', accent: '#863F48' }),
  forest: classicTheme({
    accent: '#27664D',
    page: '#E0EAE2',
    panel: '#FAFCF8',
    heading: '#EFF5EE',
    ink: '#243B30',
    muted: '#53675B',
    border: '#CDDACF',
    series: ['#2D7359', '#A67733', '#507CA3', '#97637A', '#487D91', '#AD6243', '#7865A0', '#69746D'],
  }, { mode: 'dark', background: '#214B3B', ink: '#F3F8F3', muted: '#CDDCCE', accent: '#ABE1BE' }),
  graphite: classicTheme({
    accent: '#A64F20',
    page: '#E7E5E2',
    panel: '#FFFFFF',
    heading: '#F4F2EF',
    ink: '#303238',
    muted: '#616168',
    border: '#DBD8D3',
    series: ['#B85C27', '#466BA3', '#357C72', '#836791', '#9F526D', '#91812E', '#4C839E', '#6B7280'],
  }, { mode: 'dark', background: '#303238', ink: '#F4F4F5', muted: '#CBCBD0', accent: '#F2BB8F' }),
  dark: classicTheme({
    mode: 'dark',
    accent: '#8EAAE7',
    page: '#10151D',
    panel: '#1B222C',
    heading: '#222B36',
    ink: '#F2F5F9',
    muted: '#A7B3C4',
    border: '#34404D',
    series: ['#86A4E8', '#74B9B1', '#D9B064', '#B6A0D8', '#78B3CF', '#D98FAC', '#9CA8BA', '#A9C57B'],
  }, { mode: 'dark', background: '#252E39', ink: '#F2F5F9', muted: '#A7B3C4', accent: '#8EAAE7' }),
}

export const NAVBAR_COLORS = {
  background: '#20242A',
  text: '#D0D5DD',
  title: NEUTRAL.white,
  border: alphaColor(NEUTRAL.white, 0.08),
  hover: alphaColor(NEUTRAL.white, 0.08),
}
