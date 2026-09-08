import type { LensTheme } from './tokens'
import { alphaColor, DARK_THEME, LIGHT_THEME, mixColor, NAVBAR_COLORS } from './tokens'

/** 全局和局部作用域共用的 DOM / Element Plus 适配。不得在页面里重算色阶。 */
export function themeCssVars(theme: LensTheme): Record<string, string> {
  const { surface, text, border, primary, shadow } = theme
  const vars: Record<string, string> = {
    '--na-content-bg': surface.page,
    '--na-surface-bg': surface.panel,
    '--na-surface-elevated': surface.elevated,
    '--na-heading-bg': theme.heading.background,
    '--na-heading-color': theme.heading.color,
    '--na-heading-border': theme.heading.border,
    '--na-fill-color': surface.hover,
    '--na-fill-color-light': surface.subtle,
    '--na-fill-color-lighter': surface.faint,
    '--na-text-strong': text.strong,
    '--na-text-regular': text.regular,
    '--na-text-muted': text.muted,
    '--na-text-disabled': text.disabled,
    '--na-border-color': border.normal,
    '--na-border-color-light': border.light,
    '--na-border-color-lighter': border.subtle,
    '--na-shadow-surface': shadow.panel,
    '--na-shadow-floating': shadow.floating,
    '--na-shadow-sheet': shadow.sheet,
    '--na-chart-accent': theme.chart.series[0],
    '--na-chart-track': mixColor(theme.chart.series[0], surface.panel, 0.1),
    '--na-chart-grid': theme.chart.grid,
    '--na-brand-on-dark': DARK_THEME.primary.base,
    '--na-brand-on-dark-muted': mixColor(DARK_THEME.primary.base, NAVBAR_COLORS.background, 0.75),
    '--na-brand-on-dark-light': mixColor(DARK_THEME.primary.base, NAVBAR_COLORS.title, 0.55),
    '--na-resizer-color': alphaColor(primary.base, 0.35),
    '--na-navbar-bg': NAVBAR_COLORS.background,
    '--na-navbar-border-color': NAVBAR_COLORS.border,
    '--na-navbar-title-color': NAVBAR_COLORS.title,
    '--na-navbar-text-color': NAVBAR_COLORS.text,
    '--na-navbar-hover-text-color': NAVBAR_COLORS.title,
    '--na-navbar-hover-bg': NAVBAR_COLORS.hover,
    '--el-bg-color': surface.panel,
    '--el-bg-color-page': surface.page,
    '--el-bg-color-overlay': surface.elevated,
    '--el-fill-color-blank': surface.panel,
    '--el-fill-color': surface.hover,
    '--el-fill-color-light': surface.subtle,
    '--el-fill-color-lighter': surface.faint,
    '--el-fill-color-extra-light': surface.faint,
    '--el-fill-color-dark': border.light,
    '--el-fill-color-darker': border.normal,
    '--el-text-color-primary': text.strong,
    '--el-text-color-regular': text.regular,
    '--el-text-color-secondary': text.muted,
    '--el-text-color-placeholder': text.muted,
    '--el-text-color-disabled': text.disabled,
    '--el-border-color': border.normal,
    '--el-border-color-light': border.light,
    '--el-border-color-lighter': border.subtle,
    '--el-border-color-extra-light': border.subtle,
    '--el-border-color-dark': border.normal,
    '--el-border-color-darker': text.disabled,
    '--el-border-color-hover': text.disabled,
    '--el-disabled-bg-color': surface.subtle,
    '--el-disabled-border-color': border.light,
    '--el-disabled-text-color': text.disabled,
    '--el-mask-color': alphaColor(surface.panel, 0.9),
    '--el-mask-color-extra-light': alphaColor(surface.panel, 0.3),
    '--el-box-shadow-light': shadow.floating,
  }
  for (const [name, paint] of Object.entries({ primary, ...theme.status })) {
    vars[`--na-color-${name}`] = paint.base
    vars[`--na-color-${name}-hover`] = paint.hover
    vars[`--na-color-${name}-active`] = paint.active
    vars[`--na-color-${name}-soft`] = paint.soft
    vars[`--na-color-${name}-border`] = paint.border
    vars[`--na-on-${name}`] = paint.on
    vars[`--el-color-${name}`] = paint.base
    vars[`--el-color-${name}-dark-2`] = paint.active
    for (let level = 1; level <= 9; level++)
      vars[`--el-color-${name}-light-${level}`] = mixColor(paint.base, surface.panel, 1 - level / 10)
  }
  return vars
}

/** 在 Vue 挂载前安装；双 :root 确保懒加载的第三方 :root 默认值不能覆盖公共主题。 */
export function installTheme() {
  const id = 'lens-theme'
  const style = document.getElementById(id) ?? document.head.appendChild(document.createElement('style'))
  style.id = id
  style.textContent = `:root:root{${Object.entries(themeCssVars(LIGHT_THEME)).map(([key, value]) => `${key}:${value}`).join(';')}}`
}
