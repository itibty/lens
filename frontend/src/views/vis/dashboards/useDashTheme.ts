import type { DashThemeId } from './dashTheme'
import { createGlobalState, useStorage } from '@vueuse/core'
import { computed } from 'vue'
import { DEFAULT_DASH_THEME, resolveDashThemeId } from './dashTheme'

/** 同一浏览器内的所有看板共用阅读偏好，useStorage 同步其他标签页。 */
export const useDashTheme = createGlobalState(() => {
  const stored = useStorage('NA:dashboard_theme', DEFAULT_DASH_THEME, undefined, { writeDefaults: false })
  return computed<DashThemeId>({
    get: () => resolveDashThemeId(stored.value),
    set: value => stored.value = resolveDashThemeId(value),
  })
})
