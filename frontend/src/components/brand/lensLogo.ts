// 轻量棱镜光圈：系统标志与 loading 共用同一组折面，配色跟随当前主题色。
// 仅包含本地静态 SVG，可安全用于 v-html 和 ElLoading 的 spinner。
export const LENS_LOGO_SVG = `
  <path fill="currentColor" d="M50 9 85.51 29.5 72.08 62.75 72.08 37.25Z" />
  <path fill="color-mix(in srgb, currentColor 70%, white)" d="M85.51 29.5 85.51 70.5 50 75.5 72.08 62.75Z" />
  <path fill="color-mix(in srgb, currentColor 42%, white)" d="M85.51 70.5 50 91 27.92 62.75 50 75.5Z" />
  <path fill="currentColor" d="M50 91 14.49 70.5 27.92 37.25 27.92 62.75Z" />
  <path fill="color-mix(in srgb, currentColor 70%, white)" d="M14.49 70.5 14.49 29.5 50 24.5 27.92 37.25Z" />
  <path fill="color-mix(in srgb, currentColor 42%, white)" d="M14.49 29.5 50 9 72.08 37.25 50 24.5Z" />
`
