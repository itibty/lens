/*
 * @Author: Chuang
 * @Date: 2025-07-02 20:15:16
 * @LastEditTime: 2025-07-03 10:44:38
 * @LastEditors: Chuang
 * @Description: v-spinner="true" 自定义loading指令（原loading指令样式统一修改难)
 */
// directives/loading.js
import type { App, DirectiveBinding } from 'vue'
import type { LoadingStyle } from '@/core/config'
import { ElLoading } from 'element-plus'
import { BRAND_LOADING_SVG, DEFAULT_LOADING_SVG, resolveLoadingStyle } from '@/components/loading/loading'

const loadingTextAttrName = 'element-loading-text'
type SpinnerElement = HTMLElement & {
  loadingInstance?: ReturnType<typeof ElLoading.service>
  loadingStyle?: LoadingStyle
}

function updateLoading(el: SpinnerElement, binding: DirectiveBinding<boolean>) {
  if (!binding.value) {
    el.loadingInstance?.close()
    el.loadingInstance = undefined
    return
  }
  const style = resolveLoadingStyle(binding.arg)
  const text = el.getAttribute(loadingTextAttrName) || ''
  if (el.loadingInstance && el.loadingStyle === style) {
    el.loadingInstance.setText(text)
    return
  }
  el.loadingInstance?.close()
  el.loadingStyle = style
  // 局部 loading 不锁 body，避免页面滚动条闪动。
  el.loadingInstance = ElLoading.service({
    target: el,
    lock: false,
    text,
    spinner: style === 'brand' ? BRAND_LOADING_SVG : DEFAULT_LOADING_SVG,
    svgViewBox: style === 'brand' ? '0 0 100 100' : '0 0 50 50',
    customClass: style === 'brand' ? 'lens-brand-loading' : 'tdesign-loading',
  })
}

export default {
  install(app: App) {
    // 默认跟随 UIConfig；v-spinner:default / v-spinner:brand 可局部覆盖。
    app.directive('spinner', {
      mounted: updateLoading,
      updated: updateLoading,
      unmounted(el: SpinnerElement) {
        el.loadingInstance?.close()
        el.loadingInstance = undefined
      },
    })
  },
}
