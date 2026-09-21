// 棱镜光圈：系统标志与 loading 共用同一组折面，配色跟随当前主题色。
// 仅包含本地静态 SVG，可安全用于 v-html 和 ElLoading 的 spinner。
export const LENS_LOGO_SVG = `
  <path fill="currentColor" d="M50 7 87.2 28.5 63.9 58.5 63.9 41.5Z" />
  <path fill="color-mix(in srgb, currentColor 70%, white)" d="M87.2 28.5 87.2 71.5 50 67 63.9 58.5Z" />
  <path fill="color-mix(in srgb, currentColor 42%, white)" d="M87.2 71.5 50 93 36.1 58.5 50 67Z" />
  <path fill="currentColor" d="M50 93 12.8 71.5 36.1 41.5 36.1 58.5Z" />
  <path fill="color-mix(in srgb, currentColor 70%, white)" d="M12.8 71.5 12.8 28.5 50 33 36.1 41.5Z" />
  <path fill="color-mix(in srgb, currentColor 42%, white)" d="M12.8 28.5 50 7 63.9 41.5 50 33Z" />
`
