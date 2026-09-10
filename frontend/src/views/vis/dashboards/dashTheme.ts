import type { LensTheme } from '@/theme/tokens'
import { themeCssVars } from '@/theme/cssVars'
import { THEME_PRESETS } from '@/theme/tokens'

/** 默认主题 / 默认圆角不写进 configJson；预览顶栏换肤只是会话临时覆盖。 */
export type DashThemeId = 't1' | 't2' | 't3' | 't4' | 't5' | 't6' | 't7' | 't8'

export type DashGlassMaterial = 'glass-clear' | 'glass-deep'

export interface DashThemePreset {
  id: DashThemeId
  name: string
  theme: LensTheme
  material?: DashGlassMaterial
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
  { id: 't7', name: '清透玻璃', theme: THEME_PRESETS.glass, material: 'glass-clear' },
  { id: 't8', name: '深海玻璃', theme: THEME_PRESETS.glassDeep, material: 'glass-deep' },
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
  if (preset.material === 'glass-clear') {
    return {
      background: 'linear-gradient(145deg, rgb(247 252 255 / 42%), rgb(222 235 247 / 16%))',
      border: '1px solid rgb(255 255 255 / 58%)',
      borderRadius: '8px',
      boxShadow: '0 3px 8px rgb(37 52 73 / 8%), inset 0 1px 0 rgb(255 255 255 / 64%)',
    }
  }
  if (preset.material === 'glass-deep') {
    return {
      background: 'radial-gradient(circle at 22% 12%, rgb(104 205 255 / 24%), transparent 46%), rgb(7 24 40 / 54%)',
      border: '1px solid rgb(193 231 255 / 24%)',
      borderRadius: '8px',
      boxShadow: '0 4px 10px rgb(0 8 20 / 34%), inset 0 1px 0 rgb(224 244 255 / 22%)',
    }
  }
  return {
    background: `linear-gradient(to bottom, ${theme.chrome.surface.panel} 32%, ${theme.surface.panel} 32%)`,
    borderRadius: '6px',
    boxShadow: `inset 0 0 0 1px ${theme.border.light}`,
  }
}

export function dashThemeCanvasSwatchStyle(preset: DashThemePreset) {
  return { background: preset.theme.surface.page }
}

interface DashGlassPointerFrame {
  clientX: number
  clientY: number
  frame: number
}

const glassPointerFrames = new WeakMap<HTMLElement, DashGlassPointerFrame>()

/** 玻璃主题的镜面高光跟随指针；每个表面每帧最多更新一次。 */
export function trackDashGlassPointer(event: PointerEvent) {
  if (event.pointerType === 'touch' || !(event.currentTarget instanceof HTMLElement))
    return
  const element = event.currentTarget
  if (!element.closest('[data-dash-glass="true"]'))
    return
  const pending = glassPointerFrames.get(element)
  if (pending) {
    pending.clientX = event.clientX
    pending.clientY = event.clientY
    return
  }
  const next: DashGlassPointerFrame = {
    clientX: event.clientX,
    clientY: event.clientY,
    frame: 0,
  }
  next.frame = requestAnimationFrame(() => {
    const rect = element.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((next.clientX - rect.left) / Math.max(rect.width, 1)) * 100))
    const y = Math.min(100, Math.max(0, ((next.clientY - rect.top) / Math.max(rect.height, 1)) * 100))
    element.style.setProperty('--dash-glass-x', `${x.toFixed(1)}%`)
    element.style.setProperty('--dash-glass-y', `${y.toFixed(1)}%`)
    glassPointerFrames.delete(element)
  })
  glassPointerFrames.set(element, next)
}

export function resolveDashTheme(id?: string): DashThemePreset {
  const resolved = resolveDashThemeId(id)
  return DASH_THEME_PRESETS.find(item => item.id === resolved) ?? DASH_THEME_PRESETS[0]
}

export function isDashGlassTheme(id?: string) {
  return Boolean(resolveDashTheme(id).material)
}

function glassMaterialVars(material?: DashGlassMaterial): Record<string, string> {
  if (material === 'glass-clear') {
    return {
      '--dash-card-bg': 'rgb(238 247 255 / 18%)',
      '--dash-card-glaze': 'radial-gradient(70% 55% at var(--dash-glass-x, 18%) var(--dash-glass-y, 12%), rgb(255 255 255 / 42%) 0%, rgb(255 255 255 / 10%) 32%, transparent 70%), linear-gradient(145deg, rgb(255 255 255 / 14%) 0%, transparent 38%, rgb(126 159 190 / 5%) 72%, rgb(255 255 255 / 10%) 100%)',
      '--dash-group-glaze': 'radial-gradient(76% 58% at var(--dash-glass-x, 16%) var(--dash-glass-y, 10%), rgb(255 255 255 / 36%) 0%, rgb(255 255 255 / 9%) 34%, transparent 72%), linear-gradient(145deg, rgb(255 255 255 / 12%) 0%, transparent 42%, rgb(126 159 190 / 5%) 74%, rgb(255 255 255 / 9%) 100%)',
      '--dash-chrome-bg': 'rgb(238 247 255 / 20%)',
      '--dash-chrome-glaze': 'linear-gradient(180deg, rgb(255 255 255 / 16%), transparent)',
      '--dash-card-blur': 'blur(4px) saturate(116%)',
      '--dash-card-shadow': '0 4px 14px rgb(37 52 73 / 9%), inset 0 1px 0 rgb(255 255 255 / 62%), inset 0 -1px 0 rgb(75 101 132 / 7%)',
      '--dash-chrome-shadow': '0 3px 12px rgb(37 52 73 / 6%), inset 0 -1px 0 rgb(255 255 255 / 34%)',
      '--vis-card-border': '1px solid rgb(255 255 255 / 52%)',
    }
  }
  if (material === 'glass-deep') {
    return {
      '--dash-card-bg': 'rgb(8 25 42 / 34%)',
      '--dash-card-glaze': 'radial-gradient(66% 54% at var(--dash-glass-x, 20%) var(--dash-glass-y, 10%), rgb(103 205 255 / 20%) 0%, rgb(60 122 175 / 6%) 34%, transparent 70%), linear-gradient(155deg, rgb(218 242 255 / 7%), transparent 42%, rgb(20 108 150 / 7%))',
      '--dash-group-glaze': 'radial-gradient(76% 62% at var(--dash-glass-x, 18%) var(--dash-glass-y, 8%), rgb(103 205 255 / 16%) 0%, rgb(60 122 175 / 5%) 36%, transparent 72%), linear-gradient(155deg, rgb(218 242 255 / 6%), transparent 46%, rgb(20 108 150 / 6%))',
      '--dash-chrome-bg': 'rgb(7 22 37 / 48%)',
      '--dash-chrome-glaze': 'linear-gradient(180deg, rgb(137 211 255 / 8%), transparent)',
      '--dash-card-blur': 'blur(6px) saturate(122%)',
      '--dash-card-shadow': '0 10px 30px rgb(0 6 15 / 30%), inset 0 1px 0 rgb(218 242 255 / 20%), inset 0 -1px 0 rgb(0 6 14 / 22%)',
      '--dash-chrome-shadow': '0 6px 20px rgb(0 6 15 / 22%), inset 0 -1px 0 rgb(184 228 255 / 12%)',
      '--vis-card-border': '1px solid rgb(193 231 255 / 20%)',
    }
  }
  return {}
}

export function dashThemeVars(id?: string, radiusId?: string): Record<string, string> {
  const preset = resolveDashTheme(id)
  const { theme } = preset
  return {
    ...themeCssVars(theme),
    '--dash-canvas-bg': theme.surface.page,
    '--dash-card-bg': theme.surface.panel,
    '--dash-card-glaze': 'none',
    '--dash-group-glaze': 'none',
    '--dash-chrome-bg': theme.chrome.surface.panel,
    '--dash-chrome-glaze': 'none',
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
    '--vis-card-border': 'none',
    ...glassMaterialVars(preset.material),
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
