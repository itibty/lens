// 偏心镜环：细外环包围偏心厚环，系统标志与 loading 共用，配色跟随当前主题色。
// 仅包含本地静态 SVG，可安全用于 v-html 和 ElLoading 的 spinner。
export const LENS_LOGO_SVG = `
  <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="6" />
  <path fill="currentColor" fill-rule="evenodd" d="M72 44a29 29 0 1 1-58 0 29 29 0 1 1 58 0ZM64 51a17 17 0 1 1-34 0 17 17 0 1 1 34 0Z" />
`
