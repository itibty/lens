import type { FilterStyles } from '@visactor/vtable-plugins'
import type { ThemeColors } from '@/theme/tokens'
import { FilterPlugin } from '@visactor/vtable-plugins'
import { themeCssVars } from '@/theme/cssVars'

// 沿用插件的布局，仅覆盖颜色；回调在切换筛选页签时也会被调用。
const defaults = new FilterPlugin({}).pluginOptions.styles!
const defaultTabStyle = defaults.tabStyle!
const defaultFooterButton = defaults.footerButton!

const themedStyles: FilterStyles = {
  filterMenu: {
    backgroundColor: 'var(--el-bg-color-overlay)',
    color: 'var(--el-text-color-regular)',
    borderColor: 'var(--el-border-color)',
    boxShadow: 'var(--na-shadow-floating)',
  },
  searchInput: {
    backgroundColor: 'var(--el-fill-color-blank)',
    color: 'var(--el-text-color-regular)',
    borderColor: 'var(--el-border-color)',
  },
  operatorSelect: {
    backgroundColor: 'var(--el-fill-color-blank)',
    color: 'var(--el-text-color-regular)',
    borderColor: 'var(--el-border-color)',
  },
  checkbox: { accentColor: 'var(--el-color-primary)' },
  countSpan: { color: 'var(--el-text-color-secondary)' },
  tabsContainer: { borderBottomColor: 'var(--el-border-color-light)' },
  tabStyle: isActive => ({
    ...defaultTabStyle(isActive),
    color: isActive ? 'var(--el-color-primary)' : 'var(--el-text-color-secondary)',
    borderBottomColor: isActive ? 'var(--el-color-primary)' : 'transparent',
  }),
  footerContainer: {
    backgroundColor: 'var(--el-fill-color-light)',
    borderTopColor: 'var(--el-border-color-light)',
  },
  footerButton: isPrimary => ({
    ...defaultFooterButton(isPrimary),
    backgroundColor: isPrimary ? 'var(--el-color-primary)' : 'var(--el-fill-color-blank)',
    color: isPrimary ? 'var(--na-on-primary)' : 'var(--el-text-color-regular)',
    borderColor: isPrimary ? 'var(--el-color-primary)' : 'var(--el-border-color)',
  }),
  clearLink: { color: 'var(--el-color-primary)' },
}

/** 筛选菜单挂到 body；颜色变量跟随表格实例，避免不同看板互相覆盖。 */
export function createVTableFilterPlugin(theme: ThemeColors) {
  const plugin = new FilterPlugin({ filterModes: ['byValue', 'byCondition'], styles: themedStyles })
  const styles = plugin.pluginOptions.styles!
  // 插件会合并到共享的默认样式，实例主题须放在独立的菜单样式对象上。
  plugin.pluginOptions.styles = {
    ...styles,
    filterMenu: {
      // 插件按属性顺序应用样式：先注入变量，再应用默认定位、尺寸等。
      cssText: Object.entries(themeCssVars(theme)).map(([key, value]) => `${key}:${value}`).join(';'),
      ...styles.filterMenu,
      colorScheme: theme.mode,
    },
  }
  return plugin
}
