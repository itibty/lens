import { ACCENT, LIGHT_THEME, mixColor, NEUTRAL } from '@/theme/tokens'

/** 进度条 / 指标卡共用强调色；默认不落库 */
export const VIS_ACCENT_PRESETS = [
  { id: 'default', label: '默认', color: '', wash: '' },
  { id: 'blue', label: '蓝色', color: ACCENT.blue, wash: mixColor(ACCENT.blue, NEUTRAL.white, 0.08) },
  { id: 'green', label: '绿色', color: ACCENT.green, wash: mixColor(ACCENT.green, NEUTRAL.white, 0.08) },
  { id: 'orange', label: '橙色', color: ACCENT.orange, wash: mixColor(ACCENT.orange, NEUTRAL.white, 0.08) },
  { id: 'red', label: '红色', color: ACCENT.red, wash: mixColor(ACCENT.red, NEUTRAL.white, 0.08) },
  { id: 'cyan', label: '青色', color: ACCENT.cyan, wash: mixColor(ACCENT.cyan, NEUTRAL.white, 0.08) },
  { id: 'purple', label: '紫色', color: ACCENT.purple, wash: mixColor(ACCENT.purple, NEUTRAL.white, 0.08) },
] as const

export type VisAccentPresetId = (typeof VIS_ACCENT_PRESETS)[number]['id']

const PREVIEW_FALLBACK = [LIGHT_THEME.chart.series[0], mixColor(LIGHT_THEME.chart.series[0], LIGHT_THEME.surface.panel, 0.1)] as const

export function sameCssColor(left?: string, right?: string) {
  return (left || '').trim().toLowerCase() === (right || '').trim().toLowerCase()
}

export function accentPreview(item: (typeof VIS_ACCENT_PRESETS)[number]) {
  return [item.color || PREVIEW_FALLBACK[0], item.wash || PREVIEW_FALLBACK[1]]
}

export function findAccentPreset(id: VisAccentPresetId) {
  return VIS_ACCENT_PRESETS.find(item => item.id === id)
}

export function resolveAccentByPaint(color?: string, wash?: string): VisAccentPresetId | undefined {
  if (!color && !wash)
    return 'default'
  return VIS_ACCENT_PRESETS.find(item =>
    item.id !== 'default' && sameCssColor(color, item.color) && sameCssColor(wash, item.wash),
  )?.id
}

export function resolveAccentByColor(color?: string): VisAccentPresetId | undefined {
  if (!color)
    return 'default'
  return VIS_ACCENT_PRESETS.find(item =>
    item.id !== 'default' && sameCssColor(color, item.color),
  )?.id
}
