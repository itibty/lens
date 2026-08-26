const ICON_URLS = import.meta.glob('@/assets/icons/vis-chart/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export function chartTypeIconUrl(type?: string) {
  if (!type)
    return ''
  const suffix = `/${type}.svg`
  const key = Object.keys(ICON_URLS).find(path => path.endsWith(suffix))
  return key ? ICON_URLS[key] : ''
}
