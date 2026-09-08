import type { ComputedRef, InjectionKey } from 'vue'
import type { LensTheme } from './tokens'

/** 局部主题作用域；公共卡片不依赖仪表盘业务模块。 */
export const LENS_THEME_KEY: InjectionKey<ComputedRef<LensTheme>> = Symbol('lens-theme')
