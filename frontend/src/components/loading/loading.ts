import type { LoadingStyle } from '@/core/config'
import { LENS_LOGO_SVG } from '@/components/brand/lensLogo'
import { UIConfig } from '@/core/config'
import './loading.css'

// 六片棱镜整体旋转；组件与指令共用，静态 logo 保持不动。
export const BRAND_LOADING_SVG = `
  <g class="lens-loading-orbit">
    ${LENS_LOGO_SVG}
  </g>
`

export const DEFAULT_LOADING_SVG = `<foreignObject x="0" y="0" width="100%" height="100%">
  <div class="t-loading__gradient-conic" />
</foreignObject>`

export function resolveLoadingStyle(override?: string): LoadingStyle {
  return override === 'brand' || override === 'default' ? override : UIConfig.loadingStyle
}
