import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p',
  'br',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'sub',
  'sup',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'hr',
  'pre',
  'code',
]

const ALLOWED_STYLE_PROPERTIES = new Set([
  'color',
  'background-color',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-align',
])

function sanitizeStyle(raw: string) {
  return raw
    .split(';')
    .map((item) => {
      const separator = item.indexOf(':')
      if (separator < 0)
        return ''
      const property = item.slice(0, separator).trim().toLowerCase()
      const value = item.slice(separator + 1).trim()
      if (!ALLOWED_STYLE_PROPERTIES.has(property) || !value)
        return ''
      if (/url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:/i.test(value))
        return ''
      return `${property}: ${value}`
    })
    .filter(Boolean)
    .join('; ')
}

export function sanitizeRichText(raw?: string) {
  if (!raw)
    return ''
  const fragment = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'style'],
    ALLOW_ARIA_ATTR: false,
    ALLOW_DATA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  }) as DocumentFragment

  for (const element of fragment.querySelectorAll<HTMLElement>('[style]')) {
    const style = sanitizeStyle(element.getAttribute('style') ?? '')
    if (style)
      element.setAttribute('style', style)
    else
      element.removeAttribute('style')
  }
  for (const link of fragment.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]'))
    link.setAttribute('rel', 'noopener noreferrer')

  const container = document.createElement('div')
  container.append(fragment)
  return container.innerHTML
}
