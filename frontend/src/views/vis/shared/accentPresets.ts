/** 进度条 / 指标卡共用强调色；默认不落库 */
export const VIS_ACCENT_PRESETS = [
  { id: 'default', label: '默认', color: '', wash: '' },
  { id: 'blue', label: '蓝色', color: '#1677FF', wash: '#E6F4FF' },
  { id: 'green', label: '绿色', color: '#52C41A', wash: '#F6FFED' },
  { id: 'orange', label: '橙色', color: '#FA8C16', wash: '#FFF7E6' },
  { id: 'red', label: '红色', color: '#F5222D', wash: '#FFF1F0' },
  { id: 'cyan', label: '青色', color: '#13C2C2', wash: '#E6FFFB' },
  { id: 'purple', label: '紫色', color: '#722ED1', wash: '#F9F0FF' },
] as const

export type VisAccentPresetId = (typeof VIS_ACCENT_PRESETS)[number]['id']

const PREVIEW_FALLBACK = ['#409EFF', '#E5E7EB'] as const

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
